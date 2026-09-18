import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from '../backend-node/node_modules/pg/lib/index.js';

// Explicit opt-in: this fixture creates and removes labeled work logs on the
// user-authorized public demo. Tokens remain in memory and are revoked afterward.
test('live demo Jira search and work-log create/update from both Docker backends', { skip: process.env.RUN_LIVE_JIRA_DEMO !== '1', timeout: 180000 }, async () => {
  const host = 'https://jira.demo.almworks.com';
  const basic = 'Basic ' + Buffer.from(`${process.env.JIRA_DEMO_USER}:${process.env.JIRA_DEMO_PASSWORD}`).toString('base64');
  const label = 'jira-logger compatibility ' + crypto.randomUUID();
  const response = await fetch(host + '/rest/pat/latest/tokens', { method: 'POST', headers: { Authorization: basic, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name: label.slice(0, 38), expirationDuration: 1 }) });
  if (!response.ok) throw new Error(`demo PAT creation ${response.status}: ${await response.text()}`);
  const token = await response.json();
  assert.equal(typeof token.rawToken, 'string');
  const headers = { Authorization: 'Bearer ' + token.rawToken, Accept: 'application/json', 'Content-Type': 'application/json' };
  const remoteLogs = [];
  try {
    const search = await fetch(host + '/rest/api/2/search', { method: 'POST', headers, body: JSON.stringify({ jql: 'ORDER BY updated DESC', maxResults: 1, fields: ['summary'] }) });
    assert.equal(search.status, 200);
    const issue = (await search.json()).issues[0];
    assert.ok(issue?.key, 'demo must contain an issue');
    console.log(`Live demo issue: ${issue.key}; test label: ${label}`);
    for (const [backend, port, databasePort] of [['node', 18084, 15540], ['php', 18086, 55439]]) {
      const db = new pg.Client({ connectionString: `postgresql://compatibility:disposable@127.0.0.1:${databasePort}/compatibility` });
      await db.connect();
      const original = (await db.query('SELECT * FROM setting')).rows;
      const task = crypto.randomUUID();
      const date = new Date().toISOString().slice(0, 10);
      const comment = label + ' ' + backend;
      try {
        await db.query('DELETE FROM setting');
        for (const [name, value] of Object.entries({ 'jira.enabled': 'true', 'jira.host': host, 'jira.personal-access-token': token.rawToken, 'jira.user-time-zone': 'UTC' })) await db.query('INSERT INTO setting VALUES($1,$2,$3,NOW(),NOW())', [crypto.randomUUID(), name, value]);
        await db.query('INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,NOW(),NOW())', [task, issue.key + '-#-' + comment]);
        await db.query('INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())', [crypto.randomUUID(), task, date + ' 10:00:00Z', date + ' 10:01:00Z']);
        const syncUrl = `http://127.0.0.1:${port}/api/task/${task}/${date}`;
        const created = await fetch(syncUrl, { method: 'POST', headers: { Accept: 'application/json' } });
        assert.equal(created.status, 204, `${backend} live sync create`);
        const local = (await db.query('SELECT work_log_id FROM jira_work_log WHERE task_id=$1', [task])).rows[0];
        assert.ok(local?.work_log_id);
        remoteLogs.push({ issue: issue.key, id: local.work_log_id });
        await db.query("UPDATE time_log SET end_time=start_time + INTERVAL '120 seconds' WHERE task_id=$1", [task]);
        assert.equal((await fetch(syncUrl, { method: 'POST', headers: { Accept: 'application/json' } })).status, 204, `${backend} live sync update`);
        assert.equal((await db.query('SELECT work_log_id FROM jira_work_log WHERE task_id=$1', [task])).rows[0].work_log_id, local.work_log_id);
        const remote = await fetch(`${host}/rest/api/2/issue/${issue.key}/worklog/${local.work_log_id}`, { headers });
        assert.equal(remote.status, 200);
        const workLog = await remote.json();
        assert.equal(workLog.comment, comment);
        assert.equal(workLog.timeSpentSeconds, 120);
        assert.match(workLog.started, new RegExp('^' + date + 'T17:00:00\\.000'));
        const missing = await fetch(`http://127.0.0.1:${port}/api/task/jira/missing?assignedToMe=false&resolution=all&projects=${issue.key.split('-')[0]}`, { headers: { Accept: 'application/json' } });
        assert.equal(missing.status, 200, `${backend} live missing-task search`);
        const found = await missing.json();
        assert.equal(found.meta.limit, 50);
        assert.ok(!(found.data ?? []).some(candidate => candidate.key === issue.key));
        console.log(`${backend}: live create, update, remote verification and search passed`);
      } finally {
        await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
        await db.query('DELETE FROM time_log WHERE task_id=$1', [task]);
        await db.query('DELETE FROM task WHERE id=$1', [task]);
        await db.query('DELETE FROM setting');
        for (const row of original) await db.query('INSERT INTO setting VALUES($1,$2,$3,$4,$5)', [row.id, row.name, row.value, row.created_at, row.updated_at]);
        await db.end();
      }
    }
  } finally {
    for (const log of remoteLogs) {
      const deleted = await fetch(`${host}/rest/api/2/issue/${log.issue}/worklog/${log.id}?adjustEstimate=leave`, { method: 'DELETE', headers });
      assert.ok([204, 404].includes(deleted.status), 'remove only fixture-created work logs');
    }
    const revoked = await fetch(`${host}/rest/pat/latest/tokens/${token.id}`, { method: 'DELETE', headers: { Authorization: basic } });
    assert.ok([200, 204, 404].includes(revoked.status), 'revoke fixture PAT');
    console.log('Fixture work logs removed and PAT revoked');
  }
});
