import { closeSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { SQLInputValue, StatementResultingChanges, StatementSync } from 'node:sqlite';
import { backup, DatabaseSync } from 'node:sqlite';

import type { DatabaseAccess, QueryExecutor, QueryResult } from '@database/database.types';


export class Database implements DatabaseAccess {
  public readonly handle: DatabaseSync;
  public readonly path: string;
  private releaseLock: (() => void) | undefined;

  constructor(
    path: string,
    applicationOwner = false,
  ) {
    this.path = path === ':memory:' ? path : resolve(path);

    if (path !== ':memory:') {
      mkdirSync(dirname(this.path), {
        recursive: true,
        mode: 0o700
      });
    }

    if (applicationOwner) {
      this.lock();
    }

    let handle: DatabaseSync | undefined;

    try {
      if (this.path !== ':memory:') {
        closeSync(openSync(this.path, 'a', 0o600));
      }

      handle = new DatabaseSync(this.path, {
        timeout: 5000
      });
      handle.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
      // Preserve case-insensitive filtering for non-ASCII task names.
      handle.function('lower', {
        deterministic: true
      }, (
        value,
      ) => value === null ? null : String(value).toLowerCase());
      this.handle = handle;
    } catch (error) {
      handle?.close();
      this.releaseLock?.();
      throw error;
    }
  }

  public query<R = Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
  ): QueryResult<R> {
    const statement: StatementSync = this.handle.prepare(text);
    const parameters: Record<string, SQLInputValue> = Object.fromEntries(values.map((
      value,
      index,
    ) => {
      if (value !== null && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint' && !(value instanceof Uint8Array)) {
        throw new TypeError('Unsupported database parameter');
      }

      return ['$' + (index + 1), value as SQLInputValue];
    }));

    if (statement.columns().length) {
      const rows: R[] = statement.all(parameters) as R[];

      return {
        rows,
        rowCount: rows.length
      };
    }

    const result: StatementResultingChanges = statement.run(parameters);

    return {
      rows: [],
      rowCount: Number(result.changes)
    };
  }

  public exec(
    sql: string,
  ): void {
    this.handle.exec(sql);
  }

  public transaction<T>(
    operation: (
      client: QueryExecutor,
    ) => T,
  ): T {
    if (operation.constructor.name === 'AsyncFunction') {
      throw new TypeError('Database transactions must be synchronous');
    }

    this.exec('BEGIN IMMEDIATE');
    let active: boolean = true;
    const client: QueryExecutor = {
      query: <R>(
        text: string,
        values?: unknown[],
      ) => {
        if (!active) {
          throw new Error('Transaction is closed');
        }

        return this.query<R>(text, values);
      }
    };

    try {
      const result: T = operation(client);

      if (result !== null && typeof result === 'object' && 'then' in result) {
        void Promise.resolve(result).catch(() => undefined);
        throw new TypeError('Database transactions must be synchronous');
      }

      this.exec('COMMIT');

      return result;
    } catch (error) {
      this.exec('ROLLBACK');
      throw error;
    } finally {
      active = false;
    }
  }

  public lock(): void {
    if (this.path === ':memory:' || this.releaseLock) {
      return;
    }

    const lockPath: string = this.path + '.lock';
    const descriptor: number = openSync(lockPath, 'wx', 0o600);

    try {
      writeFileSync(descriptor, process.pid + '\n');
    } catch (error) {
      unlinkSync(lockPath);
      throw error;
    } finally {
      closeSync(descriptor);
    }

    this.releaseLock = () => unlinkSync(lockPath);
  }

  public async ping(): Promise<void> {
    this.query('SELECT 1');
  }

  public async backup(
    path: string,
  ): Promise<void> {
    const descriptor: number = openSync(path, 'wx', 0o600);
    closeSync(descriptor);

    try {
      await backup(this.handle, path);
    } catch (error) {
      unlinkSync(path);
      throw error;
    }
  }

  public async end(): Promise<void> {
    try {
      if (this.handle.isOpen) {
        this.handle.close();
      }
    } finally {
      this.releaseLock?.();
      this.releaseLock = undefined;
    }
  }
}
