import pg from 'pg';

import { errorCode } from '@database/database.helpers';


export function createPool(
  connectionString: string,
): pg.Pool {
  // Parsers belong to this pool; importing the module never mutates pg's globals.
  const pool: pg.Pool = new pg.Pool({
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
  pool.on('error', (
    error,
  ) => {
    const code: unknown = errorCode(error);
    console.error('Idle PostgreSQL connection failed', {
      code: typeof code === 'string' ? code : undefined
    });
  });

  return pool;
}
