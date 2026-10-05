// Run after building backend-node. Uses only isolated containers and temporary data.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { importPostgres } from '../backend-node/dist/database/postgres-import.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const exporter = readFileSync(join(root, 'tools/export-postgres.sql'), 'utf8');
const config = join(root, '.docker/postgresql/postgresql.conf');
const image = process.env.POSTGRES_TEST_IMAGE ?? 'postgres:13-alpine';

function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  return result.stdout.trim();
}

async function withPostgres(operation, bindConfig = false) {
  const name = `jira-sqlite-migration-test-${process.pid}-${Date.now()}`;
  try {
    docker(['run', '-d', '--pull=never', '--name', name, '--network', 'none',
      '--mount', 'type=volume,dst=/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust',
      '-e', 'POSTGRES_DB=migration_test',
      ...(bindConfig ? ['-v', `${config}:/etc/postgresql/postgresql.conf:ro`] : []),
      image, ...(bindConfig ? ['postgres', '-c', 'config_file=/etc/postgresql/postgresql.conf'] : [])]);
    async function ready() {
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres', '-d', 'migration_test']);
        if (result.status === 0) return;
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      assert.fail('Isolated PostgreSQL container did not become ready');
    }
    await ready();
    const psql = sql => docker(['exec', '-i', name, 'psql', '-X', '-q', '-A', '-t',
      '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'migration_test'], sql);
    await operation({ name, psql, ready });
  } finally {
    spawnSync('docker', ['rm', '-f', '-v', name], { encoding: 'utf8', timeout: 30000 });
  }
}

function schema(timestampType) {
  const stamps = `created_at ${timestampType} NOT NULL, updated_at ${timestampType} NOT NULL`;
  return `
    CREATE TABLE task (id UUID NOT NULL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, description VARCHAR(255), ${stamps});
    CREATE TABLE tag (id UUID NOT NULL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, ${stamps});
    CREATE TABLE setting (id UUID NOT NULL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, value VARCHAR(512) NOT NULL UNIQUE, ${stamps});
    CREATE TABLE time_log (id UUID NOT NULL PRIMARY KEY, task_id UUID NOT NULL REFERENCES task(id), start_time ${timestampType} NOT NULL, end_time ${timestampType}, description VARCHAR(255), ${stamps});
    CREATE TABLE jira_work_log (id UUID NOT NULL PRIMARY KEY, task_id UUID NOT NULL REFERENCES task(id), work_log_id VARCHAR(255) NOT NULL, description VARCHAR(255), time_spent_seconds INTEGER NOT NULL, start_time DATE NOT NULL, ${stamps});
    CREATE TABLE tag_task (tag_id UUID NOT NULL REFERENCES tag(id), task_id UUID NOT NULL REFERENCES task(id), PRIMARY KEY(tag_id, task_id));
  `;
}

const task = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const timers = [
  ['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-10-04 10:00:00+00', '2026-10-04 10:00:00.999999+00', 1791108000000, 1791108000999],
  ['cccccccc-cccc-cccc-cccc-cccccccccccc', '1969-12-31 23:59:58.123456+00', '1969-12-31 23:59:59.999999+00', -1877, -1],
];

test('exports and imports microsecond timestamps from the previous timer writer', async () => {
  await withPostgres(async ({ psql }) => {
    psql(schema('TIMESTAMPTZ') + `INSERT INTO task VALUES ('${task}', 'Task', NULL, '2026-10-04 10:00:00+00', '2026-10-04 10:00:00+00');`);
    for (const [id, start, end] of timers) {
      psql(`INSERT INTO time_log VALUES ('${id}', '${task}', '${start}', '${end}', NULL, '${start}', '${start}');`);
    }
    // The previous backend used this statement when switching to another Task.
    psql(`INSERT INTO time_log VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '${task}', date_trunc('second', NOW()), NULL, NULL, date_trunc('second', NOW()), date_trunc('second', NOW()));
      UPDATE time_log SET end_time=NOW() WHERE end_time IS NULL;`);
    const snapshot = JSON.parse(psql(exporter));
    for (const [id, , , start, end] of timers) {
      const row = snapshot.records.time_log.find(row => row.id === id);
      assert.equal(row.start_time, start);
      assert.equal(row.end_time, end);
    }
    assert.equal(snapshot.records.task[0].created_at, 1791108000000);
    assert.equal(psql(`SELECT end_time::text FROM time_log WHERE id='${timers[0][0]}';`), '2026-10-04 10:00:00.999999+00');
    const directory = mkdtempSync(join(tmpdir(), 'postgres-migration-test-'));
    try {
      const source = join(directory, 'snapshot.json');
      const destination = join(directory, 'imported.sqlite');
      writeFileSync(source, JSON.stringify(snapshot), { mode: 0o600 });
      const counts = await importPostgres(source, destination);
      assert.equal(counts.time_log, 3);
      const db = new DatabaseSync(destination);
      try {
        for (const [id, , , start, end] of timers) {
          const row = db.prepare('SELECT start_time, end_time FROM time_log WHERE id=?').get(id);
          assert.equal(row.start_time, start);
          assert.equal(row.end_time, end);
        }
      } finally { db.close(); }
    } finally { rmSync(directory, { recursive: true, force: true }); }
    psql(`UPDATE time_log SET end_time='infinity' WHERE id='${timers[0][0]}';`);
    assert.throws(() => psql(exporter), /Unrepresentable timestamp/);
  });
});

test('restarts a stopped legacy PostgreSQL container with its retained bind-mounted configuration', async () => {
  assert.ok(existsSync(config), 'The legacy container configuration must remain in the checkout');
  await withPostgres(async ({ name, psql, ready }) => {
    psql(schema('TIMESTAMP(0) WITHOUT TIME ZONE') + `INSERT INTO task VALUES ('${task}', 'Legacy Task', NULL, '2025-06-01 12:32:17', '2025-06-01 12:32:17');`);
    docker(['stop', '-t', '10', name]);
    docker(['start', name]);
    await ready();
    const snapshot = JSON.parse(psql(exporter));
    assert.equal(snapshot.timestampLayout, 'legacy-riga');
    assert.equal(snapshot.records.task[0].created_at, Date.parse('2025-06-01T09:32:17Z'));
  }, true);
});
