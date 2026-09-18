import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import pg from '../backend-node/node_modules/pg/lib/index.js';

test('Jira search pagination, truncation, malformed responses and fallback match PHP', async () => {
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const original = (await db.query('SELECT * FROM setting')).rows;
  let mode, calls;
  const issue = n => ({ key: `PROBE-${n}`, fields: { summary: `Issue ${n}`, status: { name: 'Open' }, issuetype: { name: 'Task' }, updated: '2026-06-06T12:00:00+0300' } });
  const server = createServer(async (request, response) => {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    calls.push({ path: request.url, body });
    response.setHeader('Content-Type', 'application/json');
    if (mode.startsWith('fallback') && request.url.endsWith('/search')) {
      response.statusCode = Number(mode.slice(8)); response.end('{"error":"unsupported"}'); return;
    }
    if (mode === 'failure') { response.statusCode = 503; response.end('{"error":"fixture"}'); return; }
    if (mode === 'interrupted') { response.write('{"issues":'); setTimeout(() => response.destroy(), 25); return; }
    if (mode === 'empty') { response.end(''); return; }
    if (mode === 'malformed') { response.end('{'); return; }
    if (mode === 'scalar') { response.end('123'); return; }
    if (mode === 'null') { response.end('null'); return; }
    if (mode === 'missing') { response.end('{}'); return; }
    if (mode === 'emptyIssues') { response.end('{"issues":[]}'); return; }
    if (mode === 'truncate') { response.end(JSON.stringify({ issues: Array.from({ length: 51 }, (_, i) => issue(i)), total: 51 })); return; }
    const next = body.startAt > 0 || Boolean(body.nextPageToken);
    response.end(JSON.stringify({ issues: next ? [issue(1), issue(2)] : [issue(1)], total: 3, ...(request.url.endsWith('/search/jql') && !next ? { nextPageToken: 'second' } : {}) }));
  });
  await new Promise(resolve => server.listen(18083, '127.0.0.1', resolve));
  try {
    await db.query('DELETE FROM setting');
    for (const [name, value] of Object.entries({ 'jira.enabled': 'true', 'jira.host': 'http://127.0.0.1:18083/context', 'jira.personal-access-token': 'fixture-token' })) {
      await db.query('INSERT INTO setting VALUES($1,$2,$3,NOW(),NOW())', [crypto.randomUUID(), name, value]);
    }
    const differences = [];
    for (mode of ['pagination', 'truncate', 'fallback404', 'fallback405', 'fallback410', 'failure', 'interrupted', 'empty', 'malformed', 'scalar', 'null', 'missing', 'emptyIssues']) {
      const results = [];
      for (const port of [18081, 18082]) {
        calls = [];
        const response = await fetch(`http://127.0.0.1:${port}/api/task/jira/missing?assignedToMe=true&reportedByMe=true&resolution=resolved&projects=ab,CD,ab&limit=50`, { headers: { Accept: 'application/json' } });
        results.push({ status: response.status, body: await response.json(), calls });
      }
      try { assert.deepEqual(results[1], results[0]); }
      catch { differences.push({ mode, php: results[0], node: results[1] }); }
    }
    assert.deepEqual(differences, []);
  } finally {
    await db.query('DELETE FROM setting');
    for (const row of original) await db.query('INSERT INTO setting VALUES($1,$2,$3,$4,$5)', [row.id, row.name, row.value, row.created_at, row.updated_at]);
    await db.end();
    await new Promise(resolve => server.close(resolve));
  }
});
