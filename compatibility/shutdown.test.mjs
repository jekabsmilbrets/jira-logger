import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import pg from '../backend-node/node_modules/pg/lib/index.js';

test('Docker Node drains an in-flight Jira write before closing resources', { skip: process.env.RUN_DOCKER_SHUTDOWN !== '1', timeout: 30000 }, async () => {
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:15540/compatibility' });
  await db.connect();
  const original = (await db.query('SELECT * FROM setting')).rows;
  const task = crypto.randomUUID();
  let release;
  const entered = new Promise(resolve => { release = resolve; });
  let upstream;
  const server = createServer(async (request, response) => {
    for await (const _ of request) {}
    upstream = response; release();
  });
  await new Promise(resolve => server.listen(18447, '127.0.0.1', resolve));
  try {
    await db.query('DELETE FROM setting');
    for (const [name, value] of Object.entries({ 'jira.enabled': 'true', 'jira.host': 'http://host.docker.internal:18447', 'jira.personal-access-token': 'fixture-only', 'jira.user-time-zone': 'UTC' })) await db.query('INSERT INTO setting VALUES($1,$2,$3,NOW(),NOW())', [crypto.randomUUID(), name, value]);
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,'DRAIN-1',NOW(),NOW())", [task]);
    await db.query("INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,'2026-06-06 10:00:00Z','2026-06-06 10:01:00Z',NOW(),NOW())", [crypto.randomUUID(), task]);
    const pending = fetch(`http://127.0.0.1:18084/api/task/${task}/2026-06-06`, { method: 'POST', headers: { Accept: 'application/json', Connection: 'close' } });
    await entered;
    const started = Date.now();
    const child = spawn('docker', ['stop', '-t', '135', 'jira-logger-acceptance-node'], { stdio: 'ignore' });
    const stopped = new Promise(resolve => child.on('exit', resolve));
    await new Promise(resolve => setTimeout(resolve, 750));
    upstream.setHeader('Content-Type', 'application/json');
    upstream.end('{"id":"drain-fixture"}');
    assert.equal((await pending).status, 204);
    assert.equal(await stopped, 0);
    assert.ok(Date.now() - started >= 750);
    assert.equal((await db.query('SELECT work_log_id FROM jira_work_log WHERE task_id=$1', [task])).rows[0].work_log_id, 'drain-fixture');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM time_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM task WHERE id=$1', [task]);
    await db.query('DELETE FROM setting');
    for (const row of original) await db.query('INSERT INTO setting VALUES($1,$2,$3,$4,$5)', [row.id, row.name, row.value, row.created_at, row.updated_at]);
    await db.end();
    assert.equal(spawnSync('docker', ['start', 'jira-logger-acceptance-node'], { stdio: 'ignore' }).status, 0);
  }
});
