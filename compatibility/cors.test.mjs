import { test } from 'node:test';
import assert from 'node:assert/strict';

test('CORS, normal OPTIONS and content negotiation match PHP', async () => {
  const differences = [];
  for (const method of ['GET', 'OPTIONS']) for (const origin of ['http://localhost', 'https://untrusted.invalid']) for (const preflight of [true, false]) {
    const headers = { Accept: 'application/json', Origin: origin, ...(preflight ? { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Authorization, X-Fixture' } : {}) };
    const results = [];
    for (const port of [18081, 18082]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/setting`, { method, headers });
      results.push({ status: response.status, headers: Object.fromEntries([...response.headers].filter(([name]) => name.startsWith('access-control') || name === 'allow')), body: await response.text() });
    }
    // PHP escapes slashes in JSON; compare parsed representations.
    for (const result of results) { try { result.body = JSON.parse(result.body); } catch {} }
    try { assert.deepEqual(results[1], results[0]); }
    catch { differences.push({ method, origin, preflight, php: results[0], node: results[1] }); }
  }
  assert.equal(differences.length, 0, JSON.stringify(differences, null, 2));
});

test('framework errors preserve negotiated content and Vary', async () => {
  for (const accept of ['*/*', 'text/html', 'application/json, text/html', 'text/html;q=0,application/json', 'text/html;q=0.1,application/json;q=1', 'application/xml', 'application/problem+json', 'text/*']) {
    const results = [];
    for (const port of [18081, 18082]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/no-such-route`, { method: 'PUT', headers: { accept } });
      let body = await response.text();
      try { body = JSON.parse(body); } catch {}
      results.push({ status: response.status, type: response.headers.get('content-type'), vary: response.headers.get('vary'), body });
    }
    assert.deepEqual(results[1], results[0], accept);
  }
});
