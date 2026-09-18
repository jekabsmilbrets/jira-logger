import { test } from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.COMPATIBILITY_URL ?? 'http://127.0.0.1:18081';
if (!/^http:\/\/127\.0\.0\.1:1808[12]$/.test(base)) {
  throw new Error('Only isolated compatibility servers are allowed');
}
async function request(method, path, body) {
  const response = await fetch(base + path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

test('settings serialization, uniqueness, redaction, and deletion', async () => {
  const suffix = crypto.randomUUID();
  const name = `compatibility-${suffix}`;
  const created = await request('POST', '/api/setting', { name, value: suffix, ignored: true });
  assert.equal(created.status, 200);
  const id = created.body.data.id;
  try {
    assert.deepEqual(created.body.data, { id, name, value: suffix });
    assert.deepEqual(await request('POST', '/api/setting', { name, value: suffix }), {
      status: 400, body: { errors: ['Duplicate Setting name'] },
    });
    assert.deepEqual(await request('PATCH', `/api/setting/${id}`, { name, value: '***REDACTED***' }), {
      status: 400, body: { errors: ['Redacted setting values cannot be stored.'] },
    });
    const secret = await request('PATCH', `/api/setting/${id}`, { name: `${name}-ToKeN`, value: suffix });
    assert.equal(secret.body.data.value, '***REDACTED***');
    assert.equal((await request('GET', `/api/setting/${id}`)).body.data.value, '***REDACTED***');
  } finally {
    assert.equal((await request('DELETE', `/api/setting/${id}`)).status, 204);
  }
  assert.deepEqual(await request('GET', `/api/setting/${id}`), {
    status: 404, body: { errors: ['Setting not found'] },
  });
});

test('settings malformed types and validation groups', async () => {
  for (const body of [{ name: null }, { name: 1 }, { name: 'valid', value: null }]) {
    assert.deepEqual(await request('POST', '/api/setting', body), {
      status: 400, body: { errors: ['Bad Request'] },
    });
  }
  const empty = await request('POST', '/api/setting', {});
  assert.equal(empty.status, 500);
  assert.deepEqual(Object.keys(empty.body).sort(), ['detail', 'status', 'title', 'type']);
  const short = await request('POST', '/api/setting', { name: 'a', value: 'b' });
  assert.equal(short.status, 406);
  assert.deepEqual(short.body, { errors: {
    name: 'This value is too short. It should have 3 characters or more.',
    value: 'This value is too short. It should have 3 characters or more.',
  } });
});
