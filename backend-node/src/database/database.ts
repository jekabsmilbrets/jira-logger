import pg from 'pg';
import type { DatabaseAccess, DatabasePool, DatabaseSession, QueryExecutor } from './database.types.js';

export class Database implements DatabaseAccess {
  constructor(private readonly pool: DatabasePool) { }

  query<R extends pg.QueryResultRow>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>> {
    return this.pool.query<R>(text, values);
  }

  async ping(): Promise<void> { await this.pool.query('SELECT 1'); }
  connect(): Promise<DatabaseSession> { return this.pool.connect(); }
  end(): Promise<void> { return this.pool.end(); }

  async transaction<T>(operation: (client: QueryExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
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
