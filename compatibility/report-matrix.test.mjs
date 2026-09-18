import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from '../backend-node/node_modules/pg/lib/index.js';

test('report filters, boundary clipping, running timers and timezone projections match PHP', async () => {
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const tasks = Array.from({ length: 3 }, () => crypto.randomUUID());
  const tags = [crypto.randomUUID(), crypto.randomUUID()];
  const name = 'report-matrix-' + crypto.randomUUID();
  const original = (await db.query("SELECT * FROM setting WHERE name='jira.user-time-zone'")).rows[0];
  try {
    for (let i = 0; i < tasks.length; i++) await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,'2026-01-01','2026-01-01')", [tasks[i], name + '-' + i]);
    for (let i = 0; i < tags.length; i++) {
      await db.query("INSERT INTO tag(id,name,created_at,updated_at) VALUES($1,$2,'2026-01-01','2026-01-01')", [tags[i], name + '-tag-' + i]);
      await db.query('INSERT INTO tag_task VALUES($1,$2)', [tags[i], tasks[i]]);
    }
    for (const [index, start, end] of [[0, '2026-06-05 20:00:00Z', '2026-06-07 04:00:00Z'], [0, '2026-06-06 00:00:00Z', '2026-06-06 00:00:00Z'], [1, '2026-06-06 12:00:00Z', null]]) {
      await db.query("INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,$3,$4,'2026-01-01','2026-01-01')", [crypto.randomUUID(), tasks[index], start, end]);
    }
    const differences = [];
    for (const zone of ['UTC', 'Europe/Riga', 'America/New_York']) {
      await db.query("DELETE FROM setting WHERE name='jira.user-time-zone'");
      await db.query("INSERT INTO setting VALUES($1,'jira.user-time-zone',$2,NOW(),NOW())", [crypto.randomUUID(), zone]);
      for (const query of ['', '&date=2026-06-06', '&date=2026-02-30', '&startDate=2026-06-06&endDate=2026-06-06', '&startDate=2026-06-07&endDate=2026-06-05', '&startDate=2026-06-06', '&hideUnreported=true', `&tags=${tags.join(',')}`, `&tags=${tags[1]}`, '&date=invalid&date=2026-06-06', '&hideUnreported=bad', '&date=2026-06-06&startDate=invalid']) {
        const results = [];
        for (const port of [18081, 18082]) {
          const response = await fetch(`http://127.0.0.1:${port}/api/task?name=${name}${query}`, { headers: { Accept: 'application/json' } });
          results.push({ status: response.status, body: await response.json() });
        }
        try { assert.deepEqual(results[1], results[0]); }
        catch { differences.push({ zone, query, php: results[0], node: results[1] }); }
      }
    }
    assert.deepEqual(differences, []);
  } finally {
    await db.query('DELETE FROM time_log WHERE task_id=ANY($1::uuid[])', [tasks]);
    await db.query('DELETE FROM tag_task WHERE task_id=ANY($1::uuid[])', [tasks]);
    await db.query('DELETE FROM task WHERE id=ANY($1::uuid[])', [tasks]);
    await db.query('DELETE FROM tag WHERE id=ANY($1::uuid[])', [tags]);
    await db.query("DELETE FROM setting WHERE name='jira.user-time-zone'");
    if (original) await db.query('INSERT INTO setting VALUES($1,$2,$3,$4,$5)', [original.id, original.name, original.value, original.created_at, original.updated_at]);
    await db.end();
  }
});
