import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { buildServer } from '@server';
import { DateTime } from 'luxon';
import { test, vi } from 'vitest';

import { Application } from '@application/application';
import { Configuration } from '@application/configuration';

import { Database } from '@database/database';

import type { JiraSession, JiraWorkLogPayload } from '@features/jira/jira.types';
import { JiraError } from '@features/jira/jira-error';


async function fixture(
  request: JiraSession['request'] = async () => ({
 id: 'remote' 
}),
) {
  const database = new Database(':memory:');
  const application = new Application(new Configuration({
 APP_DEFAULT_USER_TIMEZONE: 'Europe/Riga' 
}), {
    database,
    jira: {
 session: async () => ({
 request 
}),
close: async () => {} 
}
  });
  await application.ready();
  const server = buildServer(application);
  const call = (
    method,
    url,
    payload,
  ) => server.inject({
 method,
url,
...(payload ? {
 payload: JSON.stringify(payload),
headers: {
 'content-type': 'application/json' 
} 
} : {}) 
});

  return {
 database,
server,
call 
};
}

test('SQLite preserves CRUD, validation, redaction, associations, report clipping and calendar dates', async () => {
  const { database, server, call } = await fixture();

  try {
    assert.equal((await call('POST', '/api/task', {
 name: 'x' 
})).statusCode, 406);
    const createdTag = await call('POST', '/api/tag', {
 name: 'Project' 
});
    const tag = createdTag.json().data;
    assert.equal(createdTag.statusCode, 200);
    const createdTask = await call('POST', '/api/task', {
 name: 'ABC-123',
description: 'Draft',
tags: [tag.id.toUpperCase()] 
});
    const task = createdTask.json().data;
    assert.equal(createdTask.statusCode, 200);
    assert.equal(task.tags[0].id, tag.id);
    assert.equal((await call('POST', '/api/task', {
 name: 'ABC-123' 
})).statusCode, 400);
    assert.equal((await call('DELETE', '/api/tag/' + tag.id)).statusCode, 409);
    assert.equal((await call('GET', '/api/task/exist/ABC-123')).statusCode, 409);
    const timer = await call('POST', '/api/task/' + task.id + '/time-log', {
      startTime: '2026-03-29T02:30:00+02:00',
endTime: '2026-03-29T04:30:00+03:00',
description: 'DST work'
    });
    assert.equal(timer.statusCode, 200);
    assert.equal(timer.json().data.startTime, '2026-03-29T02:30:00+02:00');
    assert.equal(timer.json().data.endTime, '2026-03-29T04:30:00+03:00');
    const row = database.query('SELECT * FROM time_log').rows[0];
    assert.equal(typeof row.start_time, 'number');
    assert.equal((row.end_time - row.start_time) / 1000, 3600);
    const report = await call('GET', '/api/task?date=2026-03-29&tags=' + tag.id);
    assert.equal(report.statusCode, 200);
    assert.equal(report.json().data[0].timeLogs.length, 1);
    const clipped = await call('GET', '/api/task?startDate=2026-03-29T04:00:00%2B03:00&endDate=2026-03-29T04:15:00%2B03:00');
    assert.equal(clipped.json().data[0].timeLogs[0].manuallyModified, true);
    assert.equal(clipped.json().data[0].timeLogs[0].startTime, '2026-03-29T04:00:00+03:00');
    const logId = randomUUID();
    database.query('INSERT INTO jira_work_log VALUES ($1,$2,$3,$4,$5,$6,$7,$7)', [logId, task.id, '123', null, 3600, '2026-03-29', 1]);
    const logs = await call('GET', '/api/jira-work-log');
    assert.equal(logs.json().data[0].startTime, '2026-03-29T02:00:00+02:00');
    assert.equal(database.query('SELECT start_time FROM jira_work_log').rows[0].start_time, '2026-03-29');
    const settings = (await call('GET', '/api/setting')).json().data;
    assert.notEqual(settings.find(
      (
        s,
      ) => s.name === 'jira.personal-access-token',
    ).value, 'jira_personal_access_token');
    const custom = await call('POST', '/api/setting', {
 name: 'custom.setting',
value: 'custom.value' 
});
    assert.equal(custom.statusCode, 200);
    assert.equal((await call('PATCH', '/api/setting/' + custom.json().data.id, {
 name: 'custom.setting',
value: 'changed.value' 
})).statusCode, 200);
    assert.equal((await call('DELETE', '/api/setting/' + custom.json().data.id)).statusCode, 204);
    assert.equal((await call('PATCH', '/api/task/' + task.id, {
 name: 'ABC-123',
tags: [] 
})).statusCode, 200);
    assert.equal((await call('GET', '/api/task?tags=' + tag.id)).statusCode, 404);
    assert.equal((await call('DELETE', '/api/task/' + task.id)).statusCode, 204);
    assert.equal(database.query('SELECT * FROM time_log').rowCount, 0);
    assert.equal(database.query('SELECT * FROM jira_work_log').rowCount, 0);
    assert.equal((await call('DELETE', '/api/tag/' + tag.id)).statusCode, 204);
    assert.equal((await call('GET', '/api/monitor')).statusCode, 200);
    assert.equal((await call('GET', '/api/doc')).statusCode, 200);
  } finally { await server.close(); }
});

test('overlapping tab timer actions leave one running timer and stop returns conflict when already stopped', async () => {
  const { database, server, call } = await fixture();

  try {
    const a = (await call('POST', '/api/task', {
 name: 'Task A' 
})).json().data.id;
    const b = (await call('POST', '/api/task', {
 name: 'Task B' 
})).json().data.id;
    const starts = await Promise.all([call('POST', '/api/task/' + a + '/time-log/start'), call('POST', '/api/task/' + b + '/time-log/start')]);
    assert.deepEqual(starts.map(
      (
        response,
      ) => response.statusCode,
    ), [204, 204]);
    assert.equal(database.query('SELECT * FROM time_log WHERE end_time IS NULL').rowCount, 1);
    const active = (await call('GET', '/api/task/active')).json().data;
    assert.ok([a, b].includes(active.id));
    assert.equal((await call('POST', '/api/task/' + active.id + '/time-log/stop')).statusCode, 204);
    assert.equal((await call('POST', '/api/task/' + active.id + '/time-log/stop')).statusCode, 409);
    assert.equal((await call('GET', '/api/task/active')).statusCode, 404);
    assert.equal(typeof (await call('GET', '/api/task/today/seconds')).json().data.totalSeconds, 'number');
  } finally { await server.close(); }
});

test('overlapping Jira syncs share one remote write and uncertain updates do not create a second work log', async () => {
  let writes = 0;
  let failing = false;
  const { database, server, call } = await fixture(async () => {
    writes++;
    await new Promise(
      (
        resolve,
      ) => setImmediate(resolve,
    ));

    if (failing) {
throw new JiraError('Uncertain upstream result', 500);
}

    return {
 id: '123' 
};
  });

  try {
    const task = (await call('POST', '/api/task', {
 name: 'ABC-123' 
})).json().data.id;
    await call('POST', '/api/task/' + task + '/time-log', {
 startTime: '2026-06-06T10:00:00+03:00',
endTime: '2026-06-06T11:00:00+03:00' 
});
    const responses = await Promise.all([call('POST', '/api/task/' + task + '/2026-06-06'), call('POST', '/api/task/' + task + '/2026-06-06')]);
    assert.deepEqual(responses.map(
      (
        response,
      ) => response.statusCode,
    ), [204, 204]);
    assert.equal(writes, 1);
    assert.equal(database.query('SELECT * FROM jira_work_log').rowCount, 1);
    assert.equal(database.query('SELECT time_spent_seconds FROM jira_work_log').rows[0].time_spent_seconds, 3600);
    failing = true;
    assert.equal((await call('POST', '/api/task/' + task + '/2026-06-06')).statusCode, 409);
    assert.equal(writes, 2);
    assert.equal(database.query('SELECT * FROM jira_work_log').rowCount, 1);
  } finally { await server.close(); }
});

for (const [date, hours] of [['2026-03-29', 23], ['2026-10-25', 25]] as const) {
  test(`today and Jira preserve the ${hours}-hour Riga day on ${date}`, async () => {
    const start = DateTime.fromISO(date, {
      zone: 'Europe/Riga'
    }).startOf('day');
    const end = start.plus({
      days: 1
    });
    const now = end.minus({
      hours: 1
    });
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now.toMillis());
    const payloads: JiraWorkLogPayload[] = [];
    const { database, server, call } = await fixture(async (
      _path,
      payload,
    ) => {
      payloads.push(payload as JiraWorkLogPayload);

      return {
        id: '123'
      };
    });

    try {
      const task = (await call('POST', '/api/task', {
        name: 'ABC-123'
      })).json().data.id;
      database.query('INSERT INTO time_log(id,task_id,start_time,end_time,created_at,updated_at) VALUES($1,$2,$3,NULL,0,0)', [randomUUID(), task, start.toMillis() - 1000]);
      assert.equal((await call('GET', '/api/task/today/seconds')).json().data.totalSeconds, (hours - 1) * 3600);
      assert.equal((await call('POST', `/api/task/${task}/${date}`)).statusCode, 204);
      assert.equal(payloads[0]!.timeSpentSeconds, hours * 3600 - 1);
      assert.equal(payloads[0]!.started, start.set({
        hour: 17
      }).toFormat('yyyy-MM-dd\'T\'HH:mm:ss\'.000\'ZZZ'));
      assert.equal(database.query('SELECT time_spent_seconds FROM jira_work_log').rows[0].time_spent_seconds, hours * 3600 - 1);
    } finally {
      clock.mockRestore();
      await server.close();
    }
  });
}

test('Jira sends ordered comments, keeps the task-name override and rejects 59 seconds before remote writes', async () => {
  const requests: {
    path: string;
    payload: JiraWorkLogPayload;
    method: string | undefined
  }[] = [];
  const { database, server, call } = await fixture(async (
    path,
    payload,
    method,
  ) => {
    requests.push({
      path,
      payload: payload as JiraWorkLogPayload,
      method
    });

    return {
      id: '123'
    };
  });

  try {
    const task = (await call('POST', '/api/task', {
      name: 'ABC-123'
    })).json().data.id;
    const other = (await call('POST', '/api/task', {
      name: 'DEF-456'
    })).json().data.id;
    const start = DateTime.fromISO('2026-06-06', {
      zone: 'Europe/Riga'
    }).startOf('day').toMillis();

    for (const [offset, description] of [[40000, 'later, first'], [0, 'α'], [20000, 'α']] as const) {
      database.query('INSERT INTO time_log(id,task_id,start_time,end_time,description,created_at,updated_at) VALUES($1,$2,$3,$4,$5,0,0)', [randomUUID(), task, start + offset, start + offset + 20000, description]);
    }

    database.query('INSERT INTO time_log(id,task_id,start_time,end_time,description,created_at,updated_at) VALUES($1,$2,$3,$3,$4,0,0)', [randomUUID(), task, start, '0']);
    database.query('INSERT INTO time_log(id,task_id,start_time,end_time,description,created_at,updated_at) VALUES($1,$2,$3,$4,$5,0,0)', [randomUUID(), other, start, start + 59000, 'other task']);
    assert.equal((await call('POST', `/api/task/${other}/2026-06-06`)).statusCode, 409);
    assert.equal(requests.length, 0);
    assert.equal(database.query('SELECT * FROM jira_work_log').rowCount, 0);
    assert.equal((await call('POST', `/api/task/${task}/2026-06-06`)).statusCode, 204);
    assert.equal(requests[0]!.payload.timeSpentSeconds, 60);
    assert.equal(requests[0]!.payload.comment, 'later, first, α, α');
    assert.equal(requests[0]!.path, '/issue/ABC-123/worklog');
    assert.equal(database.query('SELECT time_spent_seconds FROM jira_work_log').rows[0].time_spent_seconds, 60);
    assert.equal((await call('PATCH', `/api/task/${task}`, {
      name: 'ABC-123-#- override text -#-ignored'
    })).statusCode, 200);
    assert.equal((await call('POST', `/api/task/${task}/2026-06-06`)).statusCode, 204);
    assert.equal(requests[1]!.payload.comment, 'override text');
    assert.equal(requests[1]!.path, '/issue/ABC-123/worklog/123');
    assert.equal(requests[1]!.method, 'PUT');
    assert.equal(database.query('SELECT * FROM jira_work_log').rowCount, 1);
  } finally { await server.close(); }
});
