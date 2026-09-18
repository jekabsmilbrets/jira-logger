import pg from '../backend-node/node_modules/pg/lib/index.js';
import assert from 'node:assert/strict';

const db = new pg.Client({ connectionString: 'postgresql://compatibility:disposable@127.0.0.1:15540/compatibility' });
await db.connect();
try {
  const action = process.argv[2];
  if (action === 'prepare') {
    const task = crypto.randomUUID();
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,'browser-retry-fixture',NOW(),NOW())", [task]);
    for (const [description, start, end] of [['retry-first', '10:00:00', '10:01:00'], ['retry-second', '11:00:00', '11:01:00']]) await db.query('INSERT INTO time_log(id,task_id,description,start_time,end_time,created_at,updated_at) VALUES($1,$2,$3,$4,$5,NOW(),NOW())', [crypto.randomUUID(), task, description, '2026-06-06 ' + start + 'Z', '2026-06-06 ' + end + 'Z']);
    await db.query('CREATE SEQUENCE compatibility_browser_retry');
    await db.query('CREATE TABLE compatibility_browser_updates(description text)');
    await db.query(`CREATE FUNCTION compatibility_browser_save() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.description='retry-second-edited' AND nextval('compatibility_browser_retry')=1 THEN RAISE EXCEPTION 'disposable partial save'; END IF;
      IF NEW.description IN ('retry-first-edited','retry-second-edited') THEN INSERT INTO compatibility_browser_updates VALUES(NEW.description); END IF;
      RETURN NEW;
    END $$`);
    await db.query('CREATE TRIGGER compatibility_browser_save BEFORE UPDATE ON time_log FOR EACH ROW EXECUTE FUNCTION compatibility_browser_save()');
    console.log('Prepared browser-retry-fixture with a one-time second-row save failure.');
  } else if (action === 'verify') {
    const rows = (await db.query('SELECT description,COUNT(*)::int AS count FROM compatibility_browser_updates GROUP BY description ORDER BY description')).rows;
    assert.deepEqual(rows, [{ description: 'retry-first-edited', count: 1 }, { description: 'retry-second-edited', count: 1 }]);
    console.log('Both edits persisted exactly once across the partial failure and retry.');
  } else if (action === 'cleanup') {
    await db.query('DROP TRIGGER IF EXISTS compatibility_browser_save ON time_log');
    await db.query('DROP FUNCTION IF EXISTS compatibility_browser_save()');
    await db.query('DROP TABLE IF EXISTS compatibility_browser_updates');
    await db.query('DROP SEQUENCE IF EXISTS compatibility_browser_retry');
    await db.query("DELETE FROM time_log WHERE task_id IN (SELECT id FROM task WHERE name='browser-retry-fixture')");
    await db.query("DELETE FROM task WHERE name='browser-retry-fixture'");
  } else throw new Error('Use prepare, verify or cleanup');
} finally { await db.end(); }
