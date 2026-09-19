import pg from 'pg';


export function createPool(
  connectionString: string,
): pg.Pool {
  // Parsers belong to this pool; importing the module never mutates pg's globals.
  return new pg.Pool({
    connectionString,
    types: {
      getTypeParser: (
        oid: number,
        format?: 'text' | 'binary',
      ) =>
        [1082, 1114, 1184].includes(oid) && format !== 'binary' ? (
          value: string,
        ) => value : pg.types.getTypeParser(oid, format)
    }
  });
}
