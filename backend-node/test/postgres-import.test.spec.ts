import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import { importPostgres, type PostgresSnapshot, restoreBackup, sourceSchema } from '../src/database/postgres-import';

const directories: string[] = [];

function fixture(
  layout: 'legacy-riga' | 'utc',
): PostgresSnapshot {
  const task = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tag = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const instant = Date.parse('2025-06-01T09:32:17.000Z');
  const stamps = {
    created_at: instant,
    updated_at: instant
  };

  return {
    format: 'jira-logger-postgres-v1',
    timestampLayout: layout,
    schema: Object.fromEntries(Object.entries(sourceSchema).map((
      [table, columns],
    ) => [table, columns.map(
      (
        c,
      ) => c.type === 'timestamp' ? {
        ...c,
        type: layout === 'utc' ? 'timestamp with time zone' : 'timestamp without time zone',
        precision: layout === 'utc' ? 6 : 0
      } : {
          ...c
        },
    )])),
    records: {
      task: [{
        id: task,
        name: 'ISSUE-1',
        description: null,
        ...stamps
      }],
      tag: [{
        id: tag,
        name: 'work',
        ...stamps
      }],
      setting: [],
      tag_task: [{
        tag_id: tag,
        task_id: task
      }],
      time_log: [{
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        task_id: task,
        start_time: instant,
        end_time: instant + 62000,
        description: null,
        ...stamps
      }],
      jira_work_log: [{
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        task_id: task,
        work_log_id: '123',
        description: null,
        time_spent_seconds: 62,
        start_time: '2025-06-01',
        ...stamps
      }]
    }
  };
}

function files(
  snapshot = fixture('utc'),
): {
  directory: string;
  source: string;
  destination: string
} {
  const directory = mkdtempSync(join(tmpdir(), 'postgres-import-'));
  directories.push(directory);
  const source = join(directory, 'snapshot.json');
  writeFileSync(source, JSON.stringify(snapshot));

  return {
    directory,
    source,
    destination: join(directory, 'database.sqlite')
  };
}

afterEach(() => {
  for (const path of directories.splice(0)) {
    rmSync(path, {
      recursive: true,
      force: true
    });
  }
});
describe('PostgreSQL snapshot import', () => {
  for (const layout of ['legacy-riga', 'utc'] as const) {
    it(`imports the normalized ${layout} layout with seconds and calendar dates intact`, async () => {
      const { source, destination } = files(fixture(layout));
      expect(await importPostgres(source, destination)).toEqual({
        task: 1,
        tag: 1,
        setting: 0,
        time_log: 1,
        jira_work_log: 1,
        tag_task: 1
      });
      const db = new DatabaseSync(destination);

      try {
        expect(db.prepare('SELECT (end_time-start_time)/1000 AS seconds FROM time_log').get()?.seconds).toBe(62);
        expect(db.prepare('SELECT start_time FROM jira_work_log').get()?.start_time).toBe('2025-06-01');
        expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      } finally { db.close(); }
    });
  }

  it('refuses overwrite and preserves the existing file', async () => {
    const { source, destination } = files();
    writeFileSync(destination, 'existing');
    await expect(importPostgres(source, destination)).rejects.toThrow('already exists');
    expect(readFileSync(destination, 'utf8')).toBe('existing');
  });

  for (const failure of ['layout', 'fraction', 'foreign-key', 'duplicate', 'calendar'] as const) {
    it(`rejects ${failure} and leaves no destination or temporary files`, async () => {
      const snapshot = fixture('utc');

      if (failure === 'layout') {
        snapshot.schema.task![0]!.type = 'text';
      }

      if (failure === 'fraction') {
        snapshot.records.time_log![0]!.start_time = 1.25;
      }

      if (failure === 'foreign-key') {
        snapshot.records.time_log![0]!.task_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
      }

      if (failure === 'duplicate') {
        snapshot.records.task!.push({
          ...snapshot.records.task![0]!
        });
      }

      if (failure === 'calendar') {
        snapshot.records.jira_work_log![0]!.start_time = '2025-02-30';
      }

      const { directory, source, destination } = files(snapshot);
      await expect(importPostgres(source, destination)).rejects.toThrow();
      expect(readdirSync(directory)).toEqual(['snapshot.json']);
    });
  }

  it('restores a verified standalone backup and refuses an application lock', async () => {
    const { directory, source, destination } = files();
    const backup = join(directory, 'backup.sqlite');
    await importPostgres(source, backup);
    writeFileSync(destination + '.lock', 'busy');
    expect(() => restoreBackup(backup, destination)).toThrow();
    rmSync(destination + '.lock');
    restoreBackup(backup, destination);
    const restored = new DatabaseSync(destination);

    try { expect(restored.prepare('SELECT name FROM task').get()?.name).toBe('ISSUE-1'); } finally { restored.close(); }
  });
  it('rejects unrelated SQLite databases and future schema versions', async () => {
    const { directory, source, destination } = files();
    const backup = join(directory, 'backup.sqlite');
    const unrelated = new DatabaseSync(backup);
    unrelated.exec('CREATE TABLE unrelated(value TEXT)');
    unrelated.close();
    expect(() => restoreBackup(backup, destination)).toThrow('schema version');
    rmSync(backup);
    await importPostgres(source, backup);
    const future = new DatabaseSync(backup);
    future.exec('PRAGMA user_version = 999');
    future.close();
    expect(() => restoreBackup(backup, destination)).toThrow('schema version');
  });
  it('refuses source or destination sidecars and preserves destination bytes', async () => {
    const { directory, source, destination } = files();
    const backup = join(directory, 'backup.sqlite');
    await importPostgres(source, backup);
    writeFileSync(destination, 'existing');
    writeFileSync(backup + '-wal', 'pending');
    expect(() => restoreBackup(backup, destination)).toThrow('standalone');
    rmSync(backup + '-wal');
    writeFileSync(destination + '-wal', 'pending');
    expect(() => restoreBackup(backup, destination)).toThrow('sidecars');
    expect(readFileSync(destination, 'utf8')).toBe('existing');
  });
  it('rejects corrupt backups without replacing the destination', () => {
    const { directory, destination } = files();
    const backup = join(directory, 'bad.sqlite');
    writeFileSync(backup, 'broken');
    writeFileSync(destination, 'existing');
    expect(() => restoreBackup(backup, destination)).toThrow();
    expect(readFileSync(destination, 'utf8')).toBe('existing');
    expect(readdirSync(directory).sort()).toEqual(['bad.sqlite', 'database.sqlite', 'snapshot.json']);
  });
});
