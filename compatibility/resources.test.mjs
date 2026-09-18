import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.COMPATIBILITY_URL ?? 'http://127.0.0.1:18081';
if (!/^http:\/\/127\.0\.0\.1:1808[12]$/.test(base)) throw new Error('Isolated server required');
async function request(method, path, body) {
  const response = await fetch(base + '/api/' + path, {
    method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
test('task tags, omitted/null updates, unknown associations, and in-use deletion', async () => {
  const name = 'fixture/' + crypto.randomUUID();
  const tag = await request('POST', 'tag', { name });
  assert.equal(tag.status, 200);
  const tagId = tag.body.data.id;
  const task = await request('POST', 'task', { name, description: 'original', tags: [tagId, crypto.randomUUID()] });
  assert.equal(task.status, 200);
  const id = task.body.data.id;
  try {
    assert.deepEqual(Object.keys(task.body.data).sort(), ['id', 'name', 'description', 'timeLogs', 'tags', 'jiraWorkLogs', 'createdAt', 'updatedAt', 'lastTimeLog'].sort());
    assert.equal(task.body.data.tags.length, 1);
    assert.equal((await request('GET', `task/exist/${name}`)).status, 409);
    assert.equal((await request('GET', `tag/${tagId}`)).body.data.isUsed, true);
    assert.deepEqual(await request('DELETE', `tag/${tagId}`), { status: 409, body: { errors: ['Tag is used by existing tasks'] } });
    const edited = await request('PATCH', `task/${id}`, { name, description: null });
    assert.equal(edited.body.data.description, 'original');
    assert.equal(edited.body.data.tags.length, 1);
    const cleared = await request('PATCH', `task/${id}`, { name, tags: [] });
    assert.deepEqual(cleared.body.data.tags, []);
    assert.equal((await request('GET', `tag/${tagId}`)).body.data.isUsed, false);
    assert.deepEqual(await request('POST', 'task', {}), { status: 406, body: { errors: { name: 'This value should not be blank.' } } });
  } finally {
    assert.equal((await request('DELETE', `task/${id}`)).status, 204);
    assert.equal((await request('DELETE', `tag/${tagId}`)).status, 204);
  }
});
test('timer dates, reversed intervals, scoping, null update, and lifecycle statuses', async () => {
  const task = await request('POST', 'task', { name: 'timer-' + crypto.randomUUID() });
  const id = task.body.data.id;
  const path = `task/${id}/time-log`;
  try {
    const timer = await request('POST', path, { startTime: '2026-03-29 03:30:00', endTime: '2026-03-28 12:00:00', description: 'retained', task: crypto.randomUUID() });
    assert.equal(timer.status, 200);
    assert.equal(timer.body.data.startTime, '2026-03-29T04:30:00+03:00');
    assert.equal(timer.body.data.manuallyModified, false);
    const logId = timer.body.data.id;
    const edited = await request('PATCH', `${path}/${logId}`, { startTime: '2026-03-29 03:30:00', endTime: null, description: null });
    assert.equal(edited.body.data.endTime, timer.body.data.endTime);
    assert.equal(edited.body.data.description, 'retained');
    assert.equal((await request('GET', `task/${crypto.randomUUID()}/time-log/${logId}`)).status, 404);
    assert.equal((await request('POST', `${path}/start`)).status, 204);
    assert.equal((await request('POST', `${path}/stop`)).status, 204);
    assert.equal((await request('POST', `${path}/stop`)).status, 409);
    assert.equal((await request('DELETE', `${path}/${logId}`)).status, 204);
  } finally { assert.equal((await request('DELETE', `task/${id}`)).status, 204); }
});
