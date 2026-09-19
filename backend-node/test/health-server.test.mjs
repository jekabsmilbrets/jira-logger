import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HealthServer } from '../dist/http/health-server.js';

test('private health listener narrows its contract and releases its port', async () => {
  let available = true, checks = 0;
  const server = new HealthServer({ ready: async () => {
    checks++;
    if (!available) throw new Error('private connection details');
  } }, 0);
  await server.start();
  const address = server.address();
  assert.equal(address.address, '127.0.0.1');
  const url = `http://127.0.0.1:${address.port}`;
  const duplicate = new HealthServer({ ready: async () => {} }, address.port);
  try {
    await assert.rejects(duplicate.start(), { code: 'EADDRINUSE' });
    const ok = await fetch(url + '/internal/ready');
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ready: true });
    available = false;
    const failed = await fetch(url + '/internal/ready');
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { ready: false });
    assert.equal((await fetch(url + '/internal/ready?query=1')).status, 404);
    assert.equal((await fetch(url + '/internal/ready', { method: 'POST' })).status, 404);
    assert.equal(checks, 2);
  } finally { await duplicate.close(); await server.close(); }
  assert.equal(server.address(), null);
  await server.close();
  await duplicate.start();
  await duplicate.close();
});

test('private health close drains an active readiness probe', { timeout: 5000 }, async () => {
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const server = new HealthServer({ ready: async () => { enter(); await gate; } }, 0);
  await server.start();
  const response = fetch(`http://127.0.0.1:${server.address().port}/internal/ready`, { headers: { Connection: 'close' } });
  try {
    await entered;
    let closed = false;
    const closing = server.close().then(() => { closed = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(closed, false);
    release();
    assert.deepEqual(await (await response).json(), { ready: true });
    await closing;
  } finally { release(); await response; await server.close(); }
});
