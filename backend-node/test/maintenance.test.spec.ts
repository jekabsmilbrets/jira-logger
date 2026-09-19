import assert                    from 'node:assert/strict';
import { spawnSync }             from 'node:child_process';
import { fileURLToPath }         from 'node:url';

import { after, test } from 'vitest';

import { databaseUrl } from '@application/configuration';

import { Database }   from '@database/database';
import { createPool } from '@database/postgres-pool';

import { MaintenanceRepository } from '@features/maintenance/maintenance.repository';
import { MaintenanceService }    from '@features/maintenance/maintenance.service';
import { MigrationRepository }   from '@features/maintenance/migration.repository';


if (!process.env.DATABASE_URL?.includes('@127.0.0.1:55439/compatibility')) {
  throw new Error('Disposable database required');
}

const db = new Database(createPool(databaseUrl(process.env.DATABASE_URL)));
const maintenance = new MaintenanceService(new MaintenanceRepository(db, databaseUrl(process.env.DATABASE_URL)), new MigrationRepository(db));
after(() => db.end());

test('Doctrine URL parameters are removed without changing credentials or SSL options', () => {
  assert.equal(databaseUrl('postgresql://a:b@localhost/db?serverVersion=13&charset=utf8&sslmode=require'), 'postgresql://a:b@localhost/db?sslmode=require');
});
test('PHP ledger is recognized without replaying migrations', async () => {
  const before = (await db.query('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows;
  await maintenance.migrate();
  await maintenance.migrate();
  assert.deepEqual((await db.query('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows, before);
  assert.equal(before.length, 2);
});
test('seeds are idempotent, preserve edits, unload by name, and reject unknown seeds', async () => {
  await maintenance.seed('setting');
  await maintenance.seed('tag');
  await db.query('UPDATE setting SET value=\'https://changed.invalid\' WHERE name=\'jira.host\'');
  await maintenance.seed('setting');
  assert.equal((await db.query('SELECT value FROM setting WHERE name=\'jira.host\'')).rows[0].value, 'https://changed.invalid');
  await maintenance.seed('setting', true);
  await maintenance.seed('tag', true);
  assert.equal((await db.query('SELECT * FROM setting')).rowCount, 0);
  assert.equal((await db.query('SELECT * FROM tag')).rowCount, 0);
  await assert.rejects(maintenance.seed('invalid'), RangeError);
  assert.deepEqual(await maintenance.audit(), {
    duplicates: [],
    invalidTimeLogs: []
  });
});

test('audit reports duplicates and reversed timers without changing data or failing the CLI', async () => {
  const task = crypto.randomUUID();

  try {
    await db.query('INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,NOW(),NOW())', [task, 'audit-' + task]);
    await db.query('INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,\'2026-06-06 11:00Z\',\'2026-06-06 10:00Z\',NOW(),NOW())', [crypto.randomUUID(), task]);

    for (let i = 0; i < 2; i++) {
      await db.query('INSERT INTO jira_work_log(id,task_id,work_log_id,time_spent_seconds,start_time,created_at,updated_at) VALUES($1,$2,\'audit-fixture\',60,\'2026-06-06\',NOW(),NOW())', [crypto.randomUUID(), task]);
    }

    const before = await maintenance.audit();
    assert.equal(before.duplicates[0].duplicate_count, '2');
    assert.equal(before.invalidTimeLogs[0].task_id, task);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../dist/cli.js', import.meta.url)), 'app:audit:jira-sync-data'], {
      encoding: 'utf8'
    });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), before);
    assert.deepEqual(await maintenance.audit(), before);
  } finally {
    await db.query('DELETE FROM jira_work_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM time_log WHERE task_id=$1', [task]);
    await db.query('DELETE FROM task WHERE id=$1', [task]);
  }
});
