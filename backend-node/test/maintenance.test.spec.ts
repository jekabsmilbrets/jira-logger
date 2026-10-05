import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { test } from 'vitest';

import { Database } from '@database/database';

import { MaintenanceRepository } from '@features/maintenance/maintenance.repository';
import { MaintenanceService } from '@features/maintenance/maintenance.service';
import { MigrationRepository } from '@features/maintenance/migration.repository';


test('file creation precedes preparation and a closed database still rejects preparation', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'maintenance-'));
  const path = join(directory, 'nested', 'database.sqlite');
  const db = new Database(path);
  const maintenance = new MaintenanceService(new MaintenanceRepository(db), new MigrationRepository(db), db);

  try {
    assert.equal(existsSync(path), true);
    await maintenance.prepareDatabase();
    assert.equal(db.query('PRAGMA user_version').rows[0].user_version, 1);
    await db.end();
    await assert.rejects(maintenance.prepareDatabase());
  } finally {
    await db.end();
    rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});

test('fresh preparation seeds once, preserves edits, unloads by name and rejects unknown seeds', async () => {
  const db = new Database(':memory:');
  const maintenance = new MaintenanceService(new MaintenanceRepository(db), new MigrationRepository(db), db);

  try {
    await maintenance.prepareDatabase();
    assert.equal(db.query('SELECT * FROM setting').rowCount, 5);
    assert.equal(db.query('SELECT * FROM tag').rowCount, 3);
    db.query("UPDATE setting SET value='https://changed.invalid' WHERE name='jira.host'");
    await maintenance.prepareDatabase();
    await maintenance.seed('setting');
    assert.equal(db.query("SELECT value FROM setting WHERE name='jira.host'").rows[0].value, 'https://changed.invalid');
    await maintenance.seed('setting', true);
    await maintenance.seed('tag', true);
    assert.equal(db.query('SELECT * FROM setting').rowCount, 0);
    assert.equal(db.query('SELECT * FROM tag').rowCount, 0);
    await assert.rejects(maintenance.seed('invalid'), RangeError);
    assert.deepEqual(await maintenance.audit(), {
      duplicates: [],
      invalidTimeLogs: []
    });
  } finally { await db.end(); }
});

test('existing migrated database is not seeded and audit preserves records', async () => {
  const db = new Database(':memory:');
  const migrations = new MigrationRepository(db);
  migrations.migrate();
  const maintenance = new MaintenanceService(new MaintenanceRepository(db), migrations, db);

  try {
    await maintenance.prepareDatabase();
    assert.equal(db.query('SELECT * FROM setting').rowCount, 0);
    const task = randomUUID();
    db.query('INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,$3,$3)', [task, 'Audit', 1]);
    db.query('INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,$3,$4,$3,$3)', [randomUUID(), task, 1000, 0]);

    for (let i = 0; i < 2; i++) { db.query('INSERT INTO jira_work_log(id,task_id,work_log_id,time_spent_seconds,start_time,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$6)', [randomUUID(), task, 'remote', 60, '2026-06-06', 1]); }

    const before = await maintenance.audit();
    assert.equal(before.duplicates[0].duplicate_count, '2');
    assert.equal(before.invalidTimeLogs[0].task_id, task);
    assert.deepEqual(await maintenance.audit(), before);
  } finally { await db.end(); }
});
