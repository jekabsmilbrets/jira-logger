import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { DateTime } from 'luxon';
import { afterEach, beforeEach, test } from 'vitest';

import { Database } from '@database/database';
import type { TimerRow } from '@database/records.types';

import { MigrationRepository } from '@features/maintenance/migration.repository';
import { TimersRepository } from '@features/timers/timers.repository';


const task = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const otherTask = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
let database: Database;
let repository: TimersRepository;

beforeEach(() => {
  database = new Database(':memory:');
  new MigrationRepository(database).migrate();
  repository = new TimersRepository(database);
  database.query('INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,0,0)', [task, 'ABC-123']);
  database.query('INSERT INTO task(id,name,created_at,updated_at) VALUES($1,$2,0,0)', [otherTask, 'DEF-456']);
});

afterEach(async () => {
  await database.end();
});

function timer(
  start: number,
  end: number | null,
  description: string | null = null,
  taskId = task,
): void {
  database.query('INSERT INTO time_log(id,task_id,start_time,end_time,description,created_at,updated_at) VALUES($1,$2,$3,$4,$5,0,0)', [randomUUID(), taskId, start, end, description]);
}

// Reference the former API calculation independently of the SQL implementation.
function duration(
  row: TimerRow,
  start: number,
  end: number,
  openEnd: number,
): number {
  return Math.max(0, Math.floor(Math.min(row.end_time || openEnd, end) / 1000) - Math.floor(Math.max(row.start_time, start) / 1000));
}

test('empty summaries return numeric zero and an empty comment', async () => {
  assert.equal(await repository.totalSeconds(0, 10000, 5000), 0);
  assert.deepEqual({
    ...await repository.jiraSummary(task, 0, 9999)
  }, {
    seconds: 0,
    comment: ''
  });
});

test('floor each clipped endpoint rather than the duration, including before the epoch', async () => {
  timer(1001, 2000);
  timer(-1001, -1);
  assert.equal(await repository.totalSeconds(-2000, 3000, 2500), 2);
  assert.equal((await repository.jiraSummary(task, -2000, 3000)).seconds, 2);
});

test('clip midnight crossings, sum overlapping tasks, and clamp invalid or boundary-only intervals', async () => {
  timer(-1000, 1000);
  timer(4000, null);
  timer(8000, 15000);
  timer(10000, 12000);
  timer(5000, 4000);
  timer(6000, 6000);
  timer(0, 10000, null, otherTask);
  assert.equal(await repository.totalSeconds(0, 10000, 6000), 15);
  assert.equal((await repository.jiraSummary(task, 0, 9999)).seconds, 7);
});

test('preserve zero end timestamps and the different today and Jira overlap predicates', async () => {
  timer(500, 0, 'zero end');
  assert.equal(await repository.totalSeconds(1000, 6000, 5000), 0);
  assert.deepEqual({
    ...await repository.jiraSummary(task, 1000, 6000)
  }, {
    seconds: 5,
    comment: 'zero end'
  });
  assert.equal(await repository.totalSeconds(-1000, 6000, 5000), 5);
});

test('Jira comments preserve source order, duplicates, Unicode and commas', async () => {
  timer(5000, 7000, 'later, first');
  timer(1000, 3000, 'α\nβ');
  timer(2000, 4000, 'α\nβ');
  timer(0, 1000, null);
  timer(0, 1000, '');
  timer(0, 1000, '0');
  timer(1000, 2000, ' ');
  timer(1000, 2000, 'other task', otherTask);
  timer(11000, 12000, 'outside');
  assert.deepEqual({
    ...await repository.jiraSummary(task.toUpperCase(), 0, 10000)
  }, {
    seconds: 10,
    comment: 'later, first, α\nβ, α\nβ,  '
  });
});

test('seeded summaries match the former calculations across regular and daylight-saving days', async () => {
  let seed = 314159;

  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;

    return seed / 4294967296;
  };

  const ranges = [[-86400000, 0], ...['2026-03-29', '2026-10-25', '2026-06-06'].map((
    date,
  ) => {
    const start = DateTime.fromISO(date, {
      zone: 'Europe/Riga'
    }).startOf('day');

    return [start.toMillis(), start.plus({
      days: 1
    }).toMillis()];
  })];

  for (const [start, end] of ranges) {
    const now = start! + Math.floor((end! - start!) * 0.6);

    for (let batch = 0; batch < 30; batch++) {
      database.query('DELETE FROM time_log');
      database.transaction(() => {
        for (let i = 0; i < 100; i++) {
          const beginning = start! + Math.floor((random() * 3 - 1) * (end! - start!));
          const finish = [null, 0, beginning + Math.floor((random() * 1.5 - 0.2) * (end! - start!))][Math.floor(random() * 3)]!;
          const description = [null, '', '0', ' ', 'α\nβ', 'repeat', 'repeat'][Math.floor(random() * 7)]!;
          timer(beginning, finish, description, i % 3 === 0 ? otherTask : task);
        }
      });
      const todayRows = database.query<TimerRow>('SELECT * FROM time_log WHERE start_time<=$2 AND (end_time IS NULL OR end_time>=$1) ORDER BY start_time ASC', [start!, end!]).rows;
      assert.equal(await repository.totalSeconds(start!, end!, now), todayRows.reduce((
        sum,
        row,
      ) => sum + duration(row, start!, end!, now), 0));
      const jiraEnd = end! - 1000;
      const jiraRows = (await repository.forTask(task)).filter((
        row,
      ) => row.start_time <= jiraEnd && (row.end_time || jiraEnd) >= start!);
      assert.deepEqual({
        ...await repository.jiraSummary(task, start!, jiraEnd)
      }, {
        seconds: jiraRows.reduce((
          sum,
          row,
        ) => sum + duration(row, start!, jiraEnd, jiraEnd), 0),
        comment: jiraRows.filter((
          row,
        ) => row.description && row.description !== '0').map((
          row,
        ) => row.description).join(', ')
      });
    }
  }
});
