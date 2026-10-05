export interface QueryResult<R> {
  rows: R[];
  rowCount: number;
}

export interface QueryExecutor {
  query<R = Record<string, unknown>>(
    text: string,
    values?: unknown[]
  ): QueryResult<R>;
}

export interface DatabaseAccess extends QueryExecutor {
  transaction<T>(
    operation: (
      client: QueryExecutor,
    ) => T
  ): T;
}
