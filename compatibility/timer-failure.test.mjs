import { test } from 'node:test';
import assert from 'node:assert/strict';
import pg from '../backend-node/node_modules/pg/lib/index.js';

const base = process.env.COMPATIBILITY_URL ?? 'http://127.0.0.1:18081';
if (!/^http:\/\/127\.0\.0\.1:1808[12]$/.test(base)) throw new Error('Isolated server required');
test('failed new timer keeps the separately committed bulk stop and original update timestamp', async () => {
  const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:55439/compatibility' });
  await db.connect();
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  try {
    for (const id of ids) await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES ($1,$2,NOW(),NOW())", [id, id]);
    await db.query("INSERT INTO time_log(id,task_id,start_time,created_at,updated_at) VALUES ($1,$2,NOW()-interval '1 hour','2020-01-01','2020-01-01')", [crypto.randomUUID(), ids[0]]);
    await db.query(`CREATE FUNCTION compatibility_reject_timer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.task_id='${ids[1]}' THEN RAISE EXCEPTION 'fixture insertion failure'; END IF; RETURN NEW; END $$`);
    await db.query('CREATE TRIGGER compatibility_reject_timer BEFORE INSERT ON time_log FOR EACH ROW EXECUTE FUNCTION compatibility_reject_timer()');
    const response = await fetch(`${base}/api/task/${ids[1]}/time-log/start`, { method: 'POST', headers: { Accept: 'application/json' } });
    assert.equal(response.status, 409);
    const stopped = (await db.query('SELECT end_time,updated_at FROM time_log WHERE task_id=$1', [ids[0]])).rows[0];
    assert.ok(stopped.end_time);
    assert.equal(stopped.updated_at.toISOString(), '2020-01-01T00:00:00.000Z');
    assert.equal((await db.query('SELECT * FROM time_log WHERE task_id=$1', [ids[1]])).rowCount, 0);
  } finally {
    await db.query('DROP TRIGGER IF EXISTS compatibility_reject_timer ON time_log');
    await db.query('DROP FUNCTION IF EXISTS compatibility_reject_timer()');
    await db.query('DELETE FROM time_log WHERE task_id=ANY($1)', [ids]);
    await db.query('DELETE FROM task WHERE id=ANY($1)', [ids]);
    await db.end();
  }
});
