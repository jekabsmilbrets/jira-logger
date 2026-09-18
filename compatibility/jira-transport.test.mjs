import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from '../backend-node/node_modules/pg/lib/index.js';

test('Jira accepts fixture TLS only in its client and enforces the 60-second timeout', { timeout: 150000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-tls-fixture-'));
  const key = join(directory, 'key.pem'), cert = join(directory, 'cert.pem');
  assert.equal(spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-subj', '/CN=localhost', '-days', '1'], { stdio: 'ignore' }).status, 0);
  let stall = false, calls = 0;
  const partial = process.env.JIRA_STALL_BODY === '1';
  const server = createServer({ key: readFileSync(key), cert: readFileSync(cert) }, async (request, response) => {
    for await (const _ of request) {}
    calls++;
    if (!stall) { response.setHeader('Content-Type', 'application/json'); response.end('{"id":"TLS-1"}'); }
    else if (partial) { response.setHeader('Content-Type', 'application/json'); response.write('{"id":'); }
  });
  await new Promise(resolve => server.listen(18446, '127.0.0.1', resolve));
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const original = (await db.query('SELECT * FROM setting')).rows;
  const task = crypto.randomUUID();
  try {
    await assert.rejects(fetch('https://127.0.0.1:18446'));
    await db.query('DELETE FROM setting');
    for (const [name, value] of Object.entries({ 'jira.enabled': 'true', 'jira.host': 'https://127.0.0.1:18446/context', 'jira.personal-access-token': 'fixture-token', 'jira.user-time-zone': 'Europe/Riga' })) await db.query('INSERT INTO setting VALUES($1,$2,$3,NOW(),NOW())', [crypto.randomUUID(), name, value]);
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,'TLS-1',NOW(),NOW())", [task]);
    await db.query("INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,'2026-06-06 09:00:00Z','2026-06-06 10:00:00Z',NOW(),NOW())", [crypto.randomUUID(), task]);
    const phpPort = process.env.PHP_TRANSPORT_PORT === '18086' ? 18086 : 18081;
    for (const port of [phpPort, 18082]) {
      await db.query("UPDATE setting SET value=$1 WHERE name='jira.host'", [port === 18086 ? 'https://host.docker.internal:18446/context' : 'https://127.0.0.1:18446/context']);
      stall = false;
      const url = `http://127.0.0.1:${port}/api/task/${task}/2026-06-06`;
      await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
      assert.equal((await fetch(url, { method: 'POST' })).status, 204);
      await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
      stall = true; calls = 0;
      const started = Date.now();
      const response = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' } });
      const elapsed = Date.now() - started;
      const body = await response.json();
      console.log(JSON.stringify({ port, elapsed, status: response.status, error: body.errors?.[1] }));
      assert.equal(response.status, partial ? 500 : 409);
      assert.equal(calls, 1, 'no write retries');
      assert.ok(elapsed >= 59000 && elapsed < 70000);
      if (partial) {
        assert.deepEqual(body, { type: 'https://tools.ietf.org/html/rfc2616#section-10', title: 'An error occurred', status: 500, detail: 'Internal Server Error' });
      } else {
        assert.equal(body.errors[0], 'Problems syncing with JIRA!');
        assert.match(body.errors[1], /^CURL Error: http response=0, Operation timed out after \d+ milliseconds with 0 bytes received$/);
      }
      assert.equal((await db.query('SELECT * FROM jira_work_log WHERE task_id=$1', [task])).rowCount, 0);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM time_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM task WHERE id=$1', [task]);
    await db.query('DELETE FROM setting');
    for (const row of original) await db.query('INSERT INTO setting VALUES($1,$2,$3,$4,$5)', [row.id, row.name, row.value, row.created_at, row.updated_at]);
    await db.end();
    rmSync(directory, { recursive: true });
  }
});
