import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from '../backend-node/node_modules/pg/lib/index.js';
import { migrations, migrationLock } from '../backend-node/dist/migrations.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'postgresql://compatibility:disposable@127.0.0.1:55439/';
function cli(database, php = false) {
  const process = spawn(php ? 'php' : 'node', php ? ['bin/console', 'app:migrate', '--no-interaction'] : ['backend-node/dist/cli.js', 'migrate'], {
    cwd: php ? root + 'backend' : root,
    env: { ...globalThis.process.env, DATABASE_URL: base + database + '?serverVersion=13&charset=utf8', APP_ENV: 'dev', APP_DEBUG: '0', APP_SECRET: 'fixture', APP_INTERNAL_TIMEZONE: 'UTC', APP_DEFAULT_USER_TIMEZONE: 'Europe/Riga', CORS_ALLOW_ORIGIN: '^http://localhost$' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  process.stdout.on('data', data => { output += data; });
  process.stderr.on('data', data => { output += data; });
  return new Promise(resolve => process.on('close', code => resolve({ code, output })));
}
test('fresh schema, partial migration rollback, legacy conversion and shared PHP/Node lock', async () => {
  const name = 'compatibility_migrations_' + crypto.randomUUID().replaceAll('-', '');
  const admin = new pg.Client({ connectionString: base + 'compatibility' });
  await admin.connect();
  let db;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    db = new pg.Client({ connectionString: base + name });
    await db.connect();
    // Collision after jira_work_log creation proves the first migration rolls back.
    await db.query('CREATE TABLE setting (fixture int)');
    assert.equal((await cli(name)).code, 1);
    assert.equal((await db.query("SELECT to_regclass('jira_work_log') AS table_name")).rows[0].table_name, null);
    assert.equal((await db.query('SELECT * FROM doctrine_migration_versions')).rowCount, 0);
    await db.query('DROP TABLE setting');
    for (const sql of migrations[0].sql) await db.query(sql);
    await db.query('INSERT INTO doctrine_migration_versions(version) VALUES($1)', [migrations[0].version]);
    const task = crypto.randomUUID();
    await db.query("INSERT INTO task(id,name,created_at,updated_at) VALUES($1,'legacy','2025-01-01 12:00:00','2025-07-01 12:00:00')", [task]);
    assert.equal((await cli(name)).code, 0);
    const dates = (await db.query("SELECT created_at AT TIME ZONE 'UTC' AS winter,updated_at AT TIME ZONE 'UTC' AS summer FROM task WHERE id=$1", [task])).rows[0];
    assert.equal(dates.winter, '2025-01-01 10:00:00');
    assert.equal(dates.summer, '2025-07-01 09:00:00');
    const schema = "SELECT table_name,column_name,data_type,character_maximum_length,datetime_precision,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name <> 'doctrine_migration_versions' ORDER BY table_name,ordinal_position";
    assert.deepEqual((await db.query(schema)).rows, (await admin.query(schema)).rows);
    const indexes = "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename <> 'doctrine_migration_versions' ORDER BY tablename,indexname";
    assert.deepEqual((await db.query(indexes)).rows, (await admin.query(indexes)).rows);
    for (const php of [false, true]) {
      await db.query('SELECT pg_advisory_lock($1)', [migrationLock]);
      const running = cli(name, php);
      let blocked = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        blocked = Boolean((await admin.query("SELECT 1 FROM pg_stat_activity WHERE datname=$1 AND wait_event='advisory'", [name])).rowCount);
        if (blocked) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await db.query('SELECT pg_advisory_unlock($1)', [migrationLock]);
      const result = await running;
      assert.equal(result.code, 0, result.output);
      assert.equal(blocked, true, `${php ? 'PHP' : 'Node'} must wait for the shared lock`);
    }
    assert.equal((await db.query('SELECT * FROM doctrine_migration_versions')).rowCount, 2);
  } finally {
    await db?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }
});
