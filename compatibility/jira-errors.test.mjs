import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import pg from '../backend-node/node_modules/pg/lib/index.js';

test('Jira work-log upstream failures and minimum duration preserve PHP behavior', async () => {
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const original = (await db.query('SELECT * FROM setting')).rows;
  const task = crypto.randomUUID();
  let status = 200, payload = '{}', calls = 0;
  const server = createServer(async (request, response) => {
    for await (const _ of request) {}
    calls++;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(payload);
  });
  await new Promise(resolve => server.listen(18083, '127.0.0.1', resolve));
  try {
    await db.query('DELETE FROM setting');
    for (const [name, value] of Object.entries({ 'jira.enabled': 'true', 'jira.host': 'http://127.0.0.1:18083/context', 'jira.personal-access-token': 'fixture-token', 'jira.user-time-zone': 'Europe/Riga' })) await db.query('INSERT INTO setting VALUES($1,$2,$3,NOW(),NOW())', [crypto.randomUUID(), name, value]);
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,'ERROR-1',NOW(),NOW())", [task]);
    await db.query("INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,'2026-06-06 09:00:00Z','2026-06-06 10:00:00Z',NOW(),NOW())", [crypto.randomUUID(), task]);
    const differences = [];
    for (const item of [[400, '{"error":"fixture"}'], [500, ''], [200, ''], [200, '{'], [200, 'null'], [200, '{}'], [201, '{"id":"42"}'], [204, '']]) {
      [status, payload] = item;
      const results = [];
      for (const port of [18081, 18082]) {
        await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
        calls = 0;
        const response = await fetch(`http://127.0.0.1:${port}/api/task/${task}/2026-06-06`, { method: 'POST', headers: { Accept: 'application/json' } });
        const body = response.status === 204 ? null : await response.json();
        const rows = (await db.query('SELECT work_log_id,time_spent_seconds,description FROM jira_work_log WHERE task_id=$1', [task])).rows;
        results.push({ status: response.status, body, calls, rows });
      }
      try { assert.deepEqual(results[1], results[0]); }
      catch { differences.push({ upstream: item, php: results[0], node: results[1] }); }
    }
    await db.query("UPDATE time_log SET end_time=start_time + INTERVAL '59 seconds' WHERE task_id=$1", [task]);
    for (const port of [18081, 18082]) {
      calls = 0;
      const response = await fetch(`http://127.0.0.1:${port}/api/task/${task}/2026-06-06`, { method: 'POST', headers: { Accept: 'application/json' } });
      assert.equal(response.status, 409);
      assert.equal(calls, 0);
      assert.deepEqual(await response.json(), { errors: ['Problems syncing with JIRA!', 'Cannot report less than 60 second!'] });
    }
    assert.deepEqual(differences, []);
  } finally {
    await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM time_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM task WHERE id=$1', [task]);
    await db.query('DELETE FROM setting');
    for (const row of original) await db.query('INSERT INTO setting VALUES($1,$2,$3,$4,$5)', [row.id, row.name, row.value, row.created_at, row.updated_at]);
    await db.end();
    await new Promise(resolve => server.close(resolve));
  }
});
