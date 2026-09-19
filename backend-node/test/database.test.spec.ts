import assert         from 'node:assert/strict';

import pg       from 'pg';
import { test } from 'vitest';

import { Database }   from '@database/database';
import { createPool } from '@database/postgres-pool';


test('transactions preserve ordering, rollback and release with injected sessions', async () => {
  const calls = [];
  const session = {
    query: async (
      sql,
    ) => {
      calls.push(sql);

      return {
        rows: [],
        rowCount: 0
      };
    },
    release: () => calls.push('release')
  };
  const database = new Database({
    ...session,
    connect: async () => session,
    end: async () => calls.push('end')
  });
  assert.equal(await database.transaction(async (
    client,
  ) => {
    await client.query('write');

    return 7;
  }), 7);
  assert.deepEqual(calls, ['BEGIN', 'write', 'COMMIT', 'release']);
  calls.length = 0;
  await assert.rejects(database.transaction(async () => {
    throw new Error('fixture');
  }), /fixture/);
  assert.deepEqual(calls, ['BEGIN', 'ROLLBACK', 'release']);
  await database.end();
  assert.equal(calls.at(-1), 'end');
});

test('database pools keep timestamp parsers local', async () => {
  const parser = pg.types.getTypeParser(1184);
  const pool = createPool('postgresql://localhost/unused');
  assert.equal(pool.options.types.getTypeParser(1184)('2026-06-06 10:00:00+00'), '2026-06-06 10:00:00+00');
  assert.equal(pg.types.getTypeParser(1184), parser);
  await pool.end();
});
