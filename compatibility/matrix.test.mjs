import { test } from 'node:test';
import assert from 'node:assert/strict';

const missing = '11111111-1111-4111-8111-111111111111';
const cases = [];
for (const method of ['POST', 'PATCH']) {
  cases.push({ method, path: `/api/task/invalid/time-log${method === 'PATCH' ? '/' + missing : ''}`, body: JSON.stringify({ description: 'x'.repeat(256), endTime: 'invalid' }) });
}
for (const resource of ['task', 'tag', 'setting', 'jira-work-log', `task/${missing}/time-log`]) {
  for (const body of ['', '{', '{}', '[]', 'null', '1', '"text"', '{"unknown":true}', '{"name":null}', '{"name":1}', '{"name":""}', '{"name":"ab"}', '{"name":[]}', '{"description":1}', '{"description":null}', '{"tags":null}', '{"tags":[1]}', '{"startTime":null}', '{"startTime":[]}', '{"startTime":"garbage"}', '{"startTime":0}']) {
    cases.push({ method: 'POST', path: `/api/${resource}`, body });
  }
  for (const method of ['GET', 'PATCH', 'DELETE']) cases.push({ method, path: `/api/${resource}/${missing}`, ...(method === 'PATCH' ? { body: '{}' } : {}) });
}
for (const query of ['date=invalid', 'date[]=2026-06-06', 'name[]=a', 'tags[]=a', 'hideUnreported[]=true', 'assignedToMe=bad', 'limit=01', 'limit=1e3', 'resolution=bad', 'projects=A', 'assignedToMe=false&resolution=all']) {
  cases.push({ method: 'GET', path: '/api/task?' + query });
  cases.push({ method: 'GET', path: '/api/task/jira/missing?' + query });
}
for (const path of ['/api/task', `/api/task/${missing}`, '/api/tag', '/api/setting', '/api/no-such-route']) {
  for (const method of ['PUT', 'OPTIONS']) cases.push({ method, path });
}
for (const path of ['/api/task', `/api/task/${missing}`, '/api/task/not-a-uuid', '/api/no-such-route', '/api/task/active', '/api/task/today/seconds', '/api/task/exist/name/with/slashes']) {
  cases.push({ method: 'HEAD', path });
}
for (const date of ['2026-02-30', '2026-02-31', '2026-04-31', '2026-01-01', '2026-13-01', '1780000000', '2026-01-01T00:00:00Z']) {
  cases.push({ method: 'POST', path: `/api/task/${missing}/${date}` });
}

test('PHP/Node input and error matrix', async () => {
  const differences = [];
  for (const item of cases) {
    const results = [];
    for (const port of [18081, 18082]) {
      const response = await fetch(`http://127.0.0.1:${port}${item.path}`, {
        method: item.method, headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: item.body,
      });
      const text = await response.text();
      let body; try { body = JSON.parse(text); } catch { body = text; }
      results.push({ status: response.status, body, allow: response.headers.get('allow') });
    }
    try { assert.deepEqual(results[1], results[0]); }
    catch { differences.push({ request: item, php: results[0], node: results[1] }); }
  }
  assert.deepEqual(differences, [], JSON.stringify(differences, null, 2));
});
