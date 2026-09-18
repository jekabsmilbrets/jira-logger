import pg from 'pg';
import { config } from './config.js';

// Preserve SQL DATE and timestamp text; conversion belongs to response mapping.
for (const oid of [1082, 1114, 1184]) pg.types.setTypeParser(oid, value => value);
export const db = new pg.Pool({ connectionString: config.database });
export async function transaction<T>(operation: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
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
