import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from '../backend-node/node_modules/pg/lib/index.js';

test('local Jira CRUD validation, immutable fields and no-op persistence match PHP', async () => {
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const task = crypto.randomUUID(), id = crypto.randomUUID();
  const differences = [];
  try {
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,'2026-01-01','2026-01-01')", [task, 'local-jira-' + task]);
    await db.query("INSERT INTO jira_work_log(id,task_id,work_log_id,description,time_spent_seconds,start_time,created_at,updated_at) VALUES($1,$2,'123','original',60,'2026-06-06','2026-01-01','2026-01-01')", [id, task]);
    const cases = [
      ['GET', '/' + id],
      ['POST', '', { task, timeSpentSeconds: 60, workLogId: 'ignored', startTime: '2026-06-06' }],
      ['PATCH', '/' + id, { task, timeSpentSeconds: 60, description: null }],
      ['PATCH', '/' + id, { task, timeSpentSeconds: 0, description: 'changed', workLogId: 'ignored', startTime: '2030-01-01' }],
      ['PATCH', '/' + id, { task, timeSpentSeconds: -1 }],
      ['PATCH', '/' + id, { task, timeSpentSeconds: '60' }],
      ['PATCH', '/' + id, { description: 'x'.repeat(256) }],
      ['PATCH', '/' + id, { task: crypto.randomUUID(), timeSpentSeconds: 60 }],
    ];
    for (const [method, suffix, input] of cases) {
      const results = [];
      for (const port of [18081, 18082]) {
        await db.query("UPDATE jira_work_log SET description='original',time_spent_seconds=60,updated_at='2026-01-01' WHERE id=$1", [id]);
        const r = await fetch(`http://127.0.0.1:${port}/api/jira-work-log${suffix}`, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: input && JSON.stringify(input) });
        const body = await r.json();
        if (body.data && input && (input.timeSpentSeconds !== 60 || input.description === 'changed')) body.data.updatedAt = '<current time>';
        results.push({ status: r.status, body });
      }
      try { assert.deepEqual(results[1], results[0]); }
      catch { differences.push({ method, input, php: results[0], node: results[1] }); }
    }
    assert.deepEqual(differences, []);
  } finally {
    await db.query('DELETE FROM jira_work_log WHERE id=$1', [id]);
    await db.query('DELETE FROM task WHERE id=$1', [task]);
    await db.end();
  }
});
