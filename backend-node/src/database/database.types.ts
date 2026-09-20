import type pg from 'pg';


export interface QueryExecutor {
  query<R extends pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<pg.QueryResult<R>>;
}

export interface DatabaseSession extends QueryExecutor {
  release(): void;
}

export interface DatabasePool extends QueryExecutor {
  connect(): Promise<DatabaseSession>;

  end(): Promise<void>;
}

export interface DatabaseAccess extends QueryExecutor {
  transaction<T>(
    operation: (
      client: QueryExecutor,
    ) => Promise<T>,
  ): Promise<T>;
}
