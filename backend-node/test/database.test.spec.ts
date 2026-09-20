import assert         from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:net';

import pg       from 'pg';
import { test, vi } from 'vitest';

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

test('idle connection failures are logged safely and subsequent queries reconnect', async () => {
  const sockets = [];
  const server = createServer((
    socket,
  ) => {
    sockets.push(socket);
    socket.once('data', () => {
      // AuthenticationOk and ReadyForQuery for the startup packet.
      socket.write(Buffer.from('5200000008000000005a0000000549', 'hex'));
      socket.on('data', (
        packet,
      ) => {
        if (packet[0] === 81) {
          // CommandComplete (SELECT 1) and ReadyForQuery.
          socket.write(Buffer.from('430000000d53454c4543542031005a0000000549', 'hex'));
        } else if (packet[0] === 88) {
          socket.end();
        }
      });
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const pool = createPool(`postgresql://fixture:private-password@127.0.0.1:${ server.address().port }/fixture?sslmode=disable`);
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    assert.equal((await pool.query('SELECT 1')).rowCount, 1);
    assert.equal(pool.idleCount, 1);
    // PostgreSQL ErrorResponse: FATAL, code 57P01 (administrator shutdown).
    const fields = Buffer.from('SFATAL\0C57P01\0Mterminating connection\0\0');
    const header = Buffer.alloc(5);
    header[0] = 69;
    header.writeInt32BE(fields.length + 4, 1);
    sockets[0].end(Buffer.concat([header, fields]));
    await vi.waitFor(() => assert.equal(pool.totalCount, 0));
    assert.deepEqual(log.mock.calls, [['Idle PostgreSQL connection failed', {
      code: '57P01'
    }]]);
    assert.equal((await pool.query('SELECT 1')).rowCount, 1);
    assert.equal(sockets.length, 2);
  } finally {
    await pool.end();
    sockets.forEach((
      socket,
    ) => socket.destroy());
    await new Promise((
      resolve,
    ) => server.close(resolve));
    log.mockRestore();
  }
});
