import { randomUUID } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, linkSync, openSync, readFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';

import { Database } from '@database/database';
import { acquireDatabaseLock } from '@database/database.helpers';

import { MigrationRepository } from '@features/maintenance/migration.repository';

type RecordRow = Record<string, string | number | null>;
interface Column {
  name: string;
  type: string;
  nullable: boolean;
  length: number | null;
  precision: number | null
}
const timestamp: string = 'timestamp';
const uuid: string = 'uuid';
const text: string = 'character varying';
const column: (
  name: string,
  type: string,
  nullable?: boolean,
  length?: number | null,
) => Column = (
  name: string,
  type: string,
  nullable = false,
  length: number | null = null,
): Column => ({
  name,
  type,
  nullable,
  length,
  precision: type === timestamp ? 0 : null
});
const stamps: () => Column[] = (): Column[] => [column('created_at', timestamp), column('updated_at', timestamp)];
export const sourceSchema: Record<string, Column[]> = {
  task: [column('id', uuid), column('name', text, false, 255), column('description', text, true, 255), ...stamps()],
  tag: [column('id', uuid), column('name', text, false, 255), ...stamps()],
  setting: [column('id', uuid), column('name', text, false, 255), column('value', text, false, 512), ...stamps()],
  time_log: [column('id', uuid), column('task_id', uuid), column('start_time', timestamp), column('end_time', timestamp, true), column('description', text, true, 255), ...stamps()],
  jira_work_log: [column('id', uuid), column('task_id', uuid), column('work_log_id', text, false, 255), column('description', text, true, 255), column('time_spent_seconds', 'integer'), column('start_time', 'date'), ...stamps()],
  tag_task: [column('tag_id', uuid), column('task_id', uuid)]
};
export interface PostgresSnapshot {
  format: 'jira-logger-postgres-v1';
  timestampLayout: 'legacy-riga' | 'utc';
  schema: Record<string, Column[]>;
  records: Record<string, RecordRow[]>;
}

function object(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys(
  value: object,
  expected: string[],
): boolean {
  return Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}

export function validateSnapshot(
  value: unknown,
): PostgresSnapshot {
  if (!object(value) || !keys(value, ['format', 'timestampLayout', 'schema', 'records']) || value.format !== 'jira-logger-postgres-v1' || !['legacy-riga', 'utc'].includes(String(value.timestampLayout)) || !object(value.schema) || !object(value.records) || !keys(value.schema, Object.keys(sourceSchema)) || !keys(value.records, Object.keys(sourceSchema))) {
    throw new Error('Invalid PostgreSQL snapshot structure');
  }

  for (const [table, columns] of Object.entries(sourceSchema)) {
    const expected: Column[] = columns.map(
      (
        c,
      ) => c.type === timestamp ? {
        ...c,
        precision: value.timestampLayout === 'utc' ? 6 : 0,
        type: value.timestampLayout === 'utc' ? 'timestamp with time zone' : 'timestamp without time zone'
      } : c,
    );
    const actual: unknown = value.schema[table];

    if (!Array.isArray(actual) || actual.length !== expected.length || expected.some((
      c,
      i,
    ) => !object(actual[i]) || !keys(actual[i], Object.keys(c)) || Object.entries(c).some((
      [key, entry],
    ) => actual[i][key] !== entry))) {
      throw new Error(`Unsupported PostgreSQL schema: ${table}`);
    }

    const records: unknown = value.records[table];

    if (!Array.isArray(records)) {
      throw new Error(`Invalid records: ${table}`);
    }

    for (const row of records) {
      if (!object(row) || !keys(row, columns.map(
        (
          c,
        ) => c.name,
      ))) {
        throw new Error(`Invalid row layout: ${table}`);
      }

      for (const c of columns) {
        const entry: unknown = row[c.name];

        if (entry === null && c.nullable) {
          continue;
        }

        if (c.type === timestamp || c.type === 'integer') {
          if (typeof entry !== 'number' || !Number.isSafeInteger(entry) || (c.type === timestamp && Math.abs(entry) > 8640000000000000)) {
            throw new Error(`Invalid integer or timestamp precision: ${table}.${c.name}`);
          }
        } else if (typeof entry !== 'string' || (c.length !== null && [...entry].length > c.length) || (c.type === uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(entry)) || (c.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(entry) || new Date(entry).toISOString().slice(0, 10) !== entry))) {
          throw new Error(`Invalid value: ${table}.${c.name}`);
        }
      }
    }
  }

  return value as unknown as PostgresSnapshot;
}

function verifyIntegrity(
  handle: DatabaseSync,
): void {
  if (handle.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok' || handle.prepare('PRAGMA foreign_key_check').all().length) {
    throw new Error('SQLite integrity verification failed');
  }
}

function verifyApplicationSchema(
  handle: DatabaseSync,
): void {
  const expected: Database = new Database(':memory:');

  try {
    new MigrationRepository(expected).migrate();

    if (handle.prepare('PRAGMA user_version').get()?.user_version !== expected.handle.prepare('PRAGMA user_version').get()?.user_version) {
      throw new Error('Unsupported backup schema version');
    }

    for (const table of Object.keys(sourceSchema)) {
      const actualColumns: object[] = handle.prepare(`PRAGMA table_info(${table})`).all();
      const expectedColumns: object[] = expected.handle.prepare(`PRAGMA table_info(${table})`).all();

      if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) {
        throw new Error(`Unsupported backup table layout: ${table}`);
      }

      const actualForeignKeys: object[] = handle.prepare(`PRAGMA foreign_key_list(${table})`).all();
      const expectedForeignKeys: object[] = expected.handle.prepare(`PRAGMA foreign_key_list(${table})`).all();

      if (JSON.stringify(actualForeignKeys) !== JSON.stringify(expectedForeignKeys)) {
        throw new Error(`Unsupported backup foreign keys: ${table}`);
      }
    }
  } finally { expected.handle.close(); }
}

function temporaryPath(
  destination: string,
): string {
  return join(dirname(destination), `.${randomUUID()}.sqlite`);
}

function removeOwned(
  path: string,
): void {
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(path + suffix)) {
      unlinkSync(path + suffix);
    }
  }
}

export async function importPostgres(
  snapshotPath: string,
  destinationPath: string,
): Promise<Record<string, number>> {
  const destination: string = resolve(destinationPath);

  if (existsSync(destination)) {
    throw new Error('Import destination already exists');
  }

  const snapshot: PostgresSnapshot = validateSnapshot(JSON.parse(readFileSync(snapshotPath, 'utf8')));
  const temporary: string = temporaryPath(destination);
  const reservation: number = openSync(temporary, 'wx', 0o600);
  closeSync(reservation);
  let database: Database | undefined;
  const counts: Record<string, number> = {};

  try {
    database = new Database(temporary);
    new MigrationRepository(database).migrate();
    database.transaction(() => {
      for (const [table, columns] of Object.entries(sourceSchema)) {
        if (database!.handle.prepare(`SELECT count(*) AS count FROM ${table}`).get()?.count !== 0) {
          throw new Error('Import requires empty application tables');
        }

        const statement: StatementSync = database!.handle.prepare(`INSERT INTO ${table} (${columns.map(
          (
            c,
          ) => c.name,
        ).join(',')}) VALUES (${columns.map(() => '?').join(',')})`);

        for (const row of snapshot.records[table]!) {
          statement.run(...columns.map(
            (
              c,
            ) => row[c.name]!,
          ));
        }

        const actual: object[] = database!.handle.prepare(`SELECT ${columns.map(
          (
            c,
          ) => c.name,
        ).join(',')} FROM ${table}`).all();
        const canonical: (
          rows: object[],
        ) => string = (
          rows: object[],
        ): string => JSON.stringify(rows.map(
          (
            row,
          ) => JSON.stringify(columns.map(
            (
              c,
            ) => (row as RecordRow
            )[c.name]))).sort());

        if (canonical(actual) !== canonical(snapshot.records[table]!)) {
          throw new Error(`Record verification failed: ${table}`);
        }

        counts[table] = actual.length;
      }

      verifyIntegrity(database!.handle);
      const expectedSeconds: number = snapshot.records.time_log!.reduce((
        sum,
        row,
      ) => sum + (row.end_time === null ? 0 : ((row.end_time as number) - (row.start_time as number))), 0) / 1000;
      const actualSeconds: unknown = database!.handle.prepare('SELECT coalesce(sum(end_time-start_time),0)/1000.0 AS seconds FROM time_log').get()?.seconds;

      if (actualSeconds !== expectedSeconds) {
        throw new Error('Timer total verification failed');
      }
    });
    await database.end();
    database = undefined;
    linkSync(temporary, destination);

    return counts;
  } finally {
    try {
      if (database) {
        await database.end();
      }
    } finally { removeOwned(temporary); }
  }
}

export function restoreBackup(
  backupPath: string,
  destinationPath: string,
): void {
  const destination: string = resolve(destinationPath);

  if (resolve(backupPath) === destination) {
    throw new Error('Backup and destination must differ');
  }

  if (existsSync(backupPath + '-wal') || existsSync(backupPath + '-shm')) {
    throw new Error('Restore requires a standalone consistent backup without sidecars');
  }

  const releaseLock: () => void = acquireDatabaseLock(destination);
  const temporary: string = temporaryPath(destination);
  let ownsTemporary: boolean = false;

  try {
    copyFileSync(backupPath, temporary, 1);
    ownsTemporary = true;
    const handle: DatabaseSync = new DatabaseSync(temporary, {
      readOnly: true
    });

    try { verifyIntegrity(handle); verifyApplicationSchema(handle); } finally { handle.close(); }

    if (existsSync(destination + '-wal') || existsSync(destination + '-shm')) {
      throw new Error('Destination has SQLite sidecars; cleanly close the application before restoring');
    }

    renameSync(temporary, destination);
  } finally {
    try {
      if (ownsTemporary) {
        removeOwned(temporary);
      }
    } finally {
      releaseLock();
    }
  }
}
