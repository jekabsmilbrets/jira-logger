import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.COMPATIBILITY_URL ?? 'http://127.0.0.1:18081';
if (!/^http:\/\/127\.0\.0\.1:1808[124]$/.test(base)) throw new Error('Isolated server required');
async function request(method, path, body) {
  const response = await fetch(base + '/api/' + path, {
    method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}
test('reports clip without persistence, prefer date over range, and preserve task projection', async () => {
  const name = 'report-' + crypto.randomUUID();
  const task = await request('POST', 'task', { name });
  const id = task.body.data.id;
  try {
    const timer = await request('POST', `task/${id}/time-log`, { startTime: '2026-06-05 22:00:00', endTime: '2026-06-07 02:00:00' });
    assert.equal(timer.status, 200);
    const logId = timer.body.data.id;
    const report = await request('GET', `task?name=${name}&date=2026-06-06&startDate=2025-01-01&endDate=2025-01-02`);
    assert.equal(report.status, 200);
    const projected = report.body.data[0].timeLogs[0];
    assert.equal(projected.startTime, '2026-06-06T00:00:00+03:00');
    assert.equal(projected.endTime, '2026-06-06T23:59:59+03:00');
    assert.equal(projected.manuallyModified, true);
    assert.equal(projected.originalStartTime, timer.body.data.startTime);
    assert.equal(projected.originalEndTime, timer.body.data.endTime);
    assert.deepEqual(report.body.data[0].lastTimeLog, projected);
    assert.deepEqual((await request('GET', `task/${id}/time-log/${logId}`)).body.data, timer.body.data);
    const incomplete = await request('GET', `task?name=${name}&startDate=2030-01-01`);
    assert.equal(incomplete.body.data[0].timeLogs[0].manuallyModified, false);
    assert.equal((await request('GET', `task?name=${name}&date=2030-01-01`)).status, 404);
    assert.equal((await request('GET', `task?name=${name}&hideUnreported=true`)).status, 200);
  } finally { assert.equal((await request('DELETE', `task/${id}`)).status, 204); }
});
