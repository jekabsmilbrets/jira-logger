import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { test } from 'vitest';

import { Database } from '@database/database';
import { errorCode } from '@database/database.helpers';

import { MigrationRepository } from '@features/maintenance/migration.repository';
import { TagsRepository } from '@features/tags/tags.repository';
import { TasksRepository } from '@features/tasks/tasks.repository';
import { TimersRepository } from '@features/timers/timers.repository';


test('real transactions commit, roll back and refuse asynchronous callbacks', async () => {
  const db = new Database(':memory:');

  try {
    new MigrationRepository(db).migrate();
    assert.equal(db.transaction(
      (
        client,
      ) => {
        client.query('INSERT INTO tag VALUES ($1,$2,$3,$3)', ['one', 'One', 1],
        );

        return 7;
      }), 7);
    assert.throws(() => db.transaction(
      (
        client,
      ) => {
        client.query('INSERT INTO tag VALUES ($1,$2,$3,$3)', ['two', 'Two', 2],
        );
        throw new Error('fixture');
      }), /fixture/);
    assert.equal(db.query('SELECT * FROM tag').rowCount, 1);
    assert.throws(() => db.transaction(async (
      client,
    ) => { client.query('DELETE FROM tag'); }), /synchronous/);
    assert.equal(db.query('SELECT * FROM tag').rowCount, 1);
    let scope;
    assert.throws(() => db.transaction(
      (
        client,
      ) => {
        scope = client;
        client.query('DELETE FROM tag',
        );

        return Promise.resolve();
      }), /synchronous/);
    assert.throws(() => scope.query('DELETE FROM tag'), /closed/);
    assert.equal(db.query('SELECT * FROM tag').rowCount, 1);
  } finally { await db.end(); }
});

test('constraints map to API errors, migrations are idempotent and failure rolls back', async () => {
  const db = new Database(':memory:');

  try {
    const migrations = new MigrationRepository(db);
    migrations.migrate();
    migrations.migrate();
    assert.deepEqual(migrations.status(), [{
      version: 1,
      applied: true
    }]);
    db.query('INSERT INTO tag VALUES ($1,$2,$3,$3)', ['one', 'One', 1]);

    try { db.query('INSERT INTO tag VALUES ($1,$2,$3,$3)', ['two', 'One', 1]); assert.fail(); }
    catch (error) { assert.equal(errorCode(error), 'unique'); }

    assert.throws(() => db.query('INSERT INTO tag_task VALUES ($1,$2)', ['missing', 'missing']), /FOREIGN KEY/);
    assert.throws(() => new MigrationRepository(db, [
      {
        version: 1,
        sql: ''
      },
      {
        version: 2,
        sql: 'CREATE TABLE transient(id TEXT); INSERT INTO missing VALUES (1);'
      }
    ]).migrate(), /missing/);
    assert.equal(db.query('PRAGMA user_version').rows[0].user_version, 1);
    assert.equal(db.query("SELECT name FROM sqlite_master WHERE name='transient'").rowCount, 0);
    db.exec('PRAGMA user_version=2');
    assert.throws(() => migrations.migrate(), /newer/);
  } finally { await db.end(); }
});

test('tag filters, empty relations, task deletion and timer transitions use real SQLite', async () => {
  const db = new Database(':memory:');

  try {
    new MigrationRepository(db).migrate();
    const tasks = new TasksRepository(db);
    const tags = new TagsRepository(db);
    const timers = new TimersRepository(db);
    await tags.save('tag', 'Tag', false);
    await tasks.save({
      id: 'first',
      name: 'First',
      description: null
    }, undefined, ['tag']);
    await tasks.save({
      id: 'second',
      name: 'Second',
      description: null
    }, undefined, []);
    assert.deepEqual(await tags.resolve([]), []);
    assert.deepEqual(await tags.resolve(['tag']), ['tag']);
    assert.equal((await tasks.list({
      tags: ['tag'],
      name: undefined,
      range: undefined
    }))[0].id, 'first');
    const first = await tasks.find('first');
    await tasks.save({
      id: 'first',
      name: 'First',
      description: null
    }, first, []);
    assert.equal((await tasks.list({
      tags: ['tag'],
      name: undefined,
      range: undefined
    })).length, 0);
    assert.equal(timers.changeRunning('first', 'timer1', 'start'), true);
    assert.equal(timers.changeRunning('second', 'timer2', 'start'), true);
    assert.equal(db.query('SELECT * FROM time_log WHERE end_time IS NULL').rowCount, 1);
    assert.throws(() => timers.changeRunning('missing', 'bad', 'start'), /FOREIGN KEY/);
    assert.equal(await timers.activeTask(), 'second');
    assert.equal(timers.changeRunning('second', 'unused', 'stop'), true);
    assert.equal(timers.changeRunning('second', 'unused', 'stop'), false);
    await tasks.delete('first');
    assert.equal((await timers.forTask('first')).length, 0);
  } finally { await db.end(); }
});

test('WAL readers observe committed records and migrations recheck the version on each connection', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-sqlite-isolation-'));
  const path = join(directory, 'app.sqlite');
  const writer = new Database(path);
  const reader = new Database(path);

  try {
    new MigrationRepository(writer).migrate();
    writer.query('INSERT INTO tag VALUES ($1,$2,$3,$3)', ['one', 'Before', 1]);
    assert.equal(writer.query('PRAGMA journal_mode').rows[0].journal_mode, 'wal');
    assert.equal(writer.query('PRAGMA foreign_keys').rows[0].foreign_keys, 1);
    assert.equal(writer.query('PRAGMA busy_timeout').rows[0].timeout, 5000);
    writer.transaction((
      client,
    ) => {
      client.query('UPDATE tag SET name=$1 WHERE id=$2', ['After', 'one']);
      assert.equal(reader.query('SELECT name FROM tag').rows[0].name, 'Before');
    });
    assert.equal(reader.query('SELECT name FROM tag').rows[0].name, 'After');
    new MigrationRepository(reader).migrate();
    assert.equal(reader.query('PRAGMA user_version').rows[0].user_version, 1);
  } finally {
    await writer.end();
    await reader.end();
    rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});

test('file database preserves records, backup restores and application lock excludes a second owner', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-sqlite-'));
  const path = join(directory, 'app.sqlite');
  const db = new Database(path);

  try {
    new MigrationRepository(db).migrate();
    db.lock();
    const second = new Database(path);

    try { assert.throws(() => second.lock(), /database is locked/); }
    finally { await second.end(); }

    db.query('INSERT INTO tag VALUES ($1,$2,$3,$3)', ['one', 'One', 123]);
    const snapshot = join(directory, 'backup.sqlite');
    await db.backup(snapshot);
    await assert.rejects(db.backup(snapshot), /EEXIST/);
    await db.end();
    const reopened = new Database(path), restored = new Database(snapshot);

    try {
      assert.equal(reopened.query('SELECT * FROM tag').rows[0].created_at, 123);
      assert.deepEqual(restored.query('SELECT * FROM tag').rows, reopened.query('SELECT * FROM tag').rows);
      assert.equal(reopened.query('PRAGMA integrity_check').rows[0].integrity_check, 'ok');
    } finally { await reopened.end(); await restored.end(); }
  } finally {
    await db.end(); rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});

test('ownership recovers after a holder is killed without deleting its lock file', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-sqlite-crash-'));
  const path = join(directory, 'app.sqlite');
  const holder = spawn(process.execPath, ['--input-type=module', '-e', `
    import { DatabaseSync } from 'node:sqlite';
    const lock = new DatabaseSync(process.argv[1]);
    lock.exec('BEGIN EXCLUSIVE');
    process.send('locked');
    setInterval(() => {}, 1000);
  `, path + '.lock'], {
    stdio: ['ignore', 'ignore', 'inherit', 'ipc']
  });

  try {
    await once(holder, 'message');
    assert.throws(() => new Database(path, true), {
      errcode: 5
    });
    const exited = once(holder, 'exit');
    holder.kill('SIGKILL');
    await exited;
    const recovered = new Database(path, true);

    try { await recovered.ping(); } finally { await recovered.end(); }
  } finally {
    if (holder.exitCode === null && holder.signalCode === null) {
      const exited = once(holder, 'exit');
      holder.kill('SIGKILL');
      await exited;
    }

    rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});
