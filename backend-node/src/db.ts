import pg from 'pg';

export interface QueryExecutor {
  query<R extends pg.QueryResultRow>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>>;
}
export interface DatabaseSession extends QueryExecutor { release(): void; }
export interface DatabasePool extends QueryExecutor {
  connect(): Promise<DatabaseSession>;
  end(): Promise<void>;
}
export interface DatabaseAccess extends QueryExecutor {
  transaction<T>(operation: (client: QueryExecutor) => Promise<T>): Promise<T>;
}

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

export function createPool(connectionString: string): pg.Pool {
  // Parsers belong to this pool; importing the module never mutates pg's globals.
  return new pg.Pool({
    connectionString, types: {
      getTypeParser: (oid: number, format?: 'text' | 'binary') =>
        [1082, 1114, 1184].includes(oid) && format !== 'binary' ? (value: string) => value : pg.types.getTypeParser(oid, format),
    }
  });
}

export function requiredRow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) throw new Error('Expected a database row');
  return row;
}
export function errorCode(error: unknown): unknown {
  return error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
}
