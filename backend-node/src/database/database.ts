import pg                                                                    from 'pg';

import type { DatabaseAccess, DatabasePool, DatabaseSession, QueryExecutor } from '@database/database.types';


export class Database implements DatabaseAccess {
  constructor(
    private readonly pool: DatabasePool,
  ) {
  }

  public query<R extends pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<pg.QueryResult<R>> {
    return this.pool.query<R>(text, values);
  }

  public async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  public connect(): Promise<DatabaseSession> {
    return this.pool.connect();
  }

  public end(): Promise<void> {
    return this.pool.end();
  }

  public async transaction<T>(
    operation: (
      client: QueryExecutor,
    ) => Promise<T>,
  ): Promise<T> {
    const client: DatabaseSession = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result: Awaited<T> = await operation(client);
      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
