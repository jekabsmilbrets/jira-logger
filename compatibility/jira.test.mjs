import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import pg from '../backend-node/node_modules/pg/lib/index.js';

const base = process.env.COMPATIBILITY_URL ?? 'http://127.0.0.1:18081';
if (!/^http:\/\/127\.0\.0\.1:1808[12]$/.test(base)) throw new Error('Isolated server required');
test('Jira context path, bearer payload, update fallback, local failure, search fallback and deduplication', async () => {
  const calls = [];
  let mode = 'create';
  const server = createServer(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw || '{}');
    calls.push({ method: request.method, path: request.url, headers: request.headers, body });
    response.setHeader('Content-Type', 'application/json');
    if (request.url.endsWith('/search')) { response.statusCode = 410; response.end('{"error":"legacy unsupported"}'); return; }
    if (request.url.endsWith('/search/jql')) {
      response.end(JSON.stringify({ issues: [
        { key: 'COMPAT-1', fields: { summary: 'existing', status: { name: 'Open' }, issuetype: { name: 'Task' }, updated: '2026-06-06T12:00:00+0300' } },
        { key: 'COMPAT-2', fields: { summary: 'missing', status: { name: 'Open' }, issuetype: { name: 'Task' }, updated: '2026-06-06T12:00:00+0300' } },
      ] })); return;
    }
    if (mode === 'fallback' && request.method === 'PUT') { response.statusCode = 404; response.end('{"error":"gone"}'); return; }
    response.end('{"id":"987","timeSpentSeconds":3600}');
  });
  await new Promise(resolve => server.listen(18083, '127.0.0.1', resolve));
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const taskId = crypto.randomUUID();
  const settings = { 'jira.enabled': 'true', 'jira.host': 'http://127.0.0.1:18083/context', 'jira.personal-access-token': 'fixture-only-token', 'jira.user-time-zone': 'Europe/Riga' };
  const original = (await db.query('SELECT * FROM setting')).rows;
  const sync = () => fetch(`${base}/api/task/${taskId}/2026-06-06`, { method: 'POST', headers: { Accept: 'application/json' } });
  try {
    await db.query('DELETE FROM setting');
    for (const [name, value] of Object.entries(settings)) await db.query('INSERT INTO setting(id,name,value,created_at,updated_at) VALUES ($1,$2,$3,NOW(),NOW())', [crypto.randomUUID(), name, value]);
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES ($1,'COMPAT-1-#- first suffix -#-ignored',NOW(),NOW())", [taskId]);
    await db.query("INSERT INTO time_log(id,task_id,start_time,end_time,description,created_at,updated_at) VALUES ($1,$2,'2026-06-06 09:00:00Z','2026-06-06 10:00:00Z','timer description',NOW(),NOW())", [crypto.randomUUID(), taskId]);
    assert.equal((await sync()).status, 204);
    assert.equal(calls[0].path, '/context/rest/api/2/issue/COMPAT-1/worklog');
    assert.equal(calls[0].headers.authorization, 'Bearer fixture-only-token');
    assert.deepEqual(calls[0].body, { id: null, self: null, author: null, updateAuthor: null, updated: null, timeSpent: null, comment: 'first suffix', started: '2026-06-06T17:00:00.000+0300', timeSpentSeconds: 3600, visibility: null });
    assert.equal((await db.query('SELECT description FROM jira_work_log WHERE task_id=$1', [taskId])).rows[0].description, null);
    mode = 'fallback';
    assert.equal((await sync()).status, 204);
    assert.deepEqual(calls.slice(-2).map(call => call.method), ['PUT', 'POST']);
    const search = await fetch(`${base}/api/task/jira/missing`, { headers: { Accept: 'application/json' } });
    assert.equal(search.status, 200);
    assert.deepEqual(await search.json(), { data: [{ key: 'COMPAT-2', summary: 'missing', status: 'Open', issueType: 'Task', updated: '2026-06-06T12:00:00+03:00' }], meta: { limit: 50, truncated: false } });
    assert.deepEqual(calls.slice(-2).map(call => call.path), ['/context/rest/api/2/search', '/context/rest/api/2/search/jql']);
    await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [taskId]);
    await db.query(`CREATE FUNCTION compatibility_reject_jira() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture local failure'; END $$`);
    await db.query('CREATE TRIGGER compatibility_reject_jira BEFORE INSERT ON jira_work_log FOR EACH ROW EXECUTE FUNCTION compatibility_reject_jira()');
    const before = calls.length;
    assert.equal((await sync()).status, 500);
    assert.equal(calls.length, before + 1);
    assert.equal((await db.query('SELECT * FROM jira_work_log WHERE task_id=$1', [taskId])).rowCount, 0);
  } finally {
    await db.query('DROP TRIGGER IF EXISTS compatibility_reject_jira ON jira_work_log');
    await db.query('DROP FUNCTION IF EXISTS compatibility_reject_jira()');
    for (const table of ['jira_work_log', 'time_log']) await db.query(`DELETE FROM ${table} WHERE task_id=$1`, [taskId]);
    await db.query('DELETE FROM task WHERE id=$1', [taskId]);
    await db.query('DELETE FROM setting');
    for (const row of original) await db.query('INSERT INTO setting VALUES ($1,$2,$3,$4,$5)', [row.id, row.name, row.value, row.created_at, row.updated_at]);
    await db.end();
    await new Promise(resolve => server.close(resolve));
  }
});
