import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Application } from '../dist/application.js';
import { Configuration } from '../dist/config.js';
import { Database } from '../dist/db.js';
import { buildServer } from '../dist/server.js';

function fixture(name, options = {}) {
  const calls = { queries: 0, databaseClosed: 0, jiraClosed: 0 };
  const pool = {
    query: async (sql) => {
      calls.queries++;
      if (options.query) return options.query(sql);
      return { rows: [{ id: name, name: 'fixture.name', value: name }], rowCount: 1 };
    },
    connect: async () => { throw new Error('Unexpected transaction'); },
    end: async () => { calls.databaseClosed++; if (options.failClose) throw new Error('fixture close'); },
  };
  const jira = { session: async () => { throw new Error('Unexpected Jira request'); }, close: async () => { calls.jiraClosed++; } };
  const application = new Application(new Configuration({}), { database: new Database(pool), jira });
  return { application, calls };
}

test('independent servers use their injected resources and close them once', async () => {
  const first = fixture('first'), second = fixture('second');
  const a = buildServer(first.application), b = buildServer(second.application);
  try {
    assert.equal(first.calls.queries + second.calls.queries, 0, 'construction must not query');
    assert.equal((await a.inject('/api/setting')).json().data[0].value, 'first');
    assert.equal((await b.inject('/api/setting')).json().data[0].value, 'second');
    await a.close();
    await first.application.close();
    assert.equal(first.calls.databaseClosed, 1);
    assert.equal(first.calls.jiraClosed, 1);
    assert.equal(second.calls.databaseClosed, 0);
    assert.equal((await b.inject('/api/setting')).json().data[0].value, 'second');
  } finally { await a.close(); await b.close(); }
});

test('cleanup closes Jira even when the database close fails', async () => {
  const { application, calls } = fixture('failure', { failClose: true });
  await assert.rejects(application.close(), AggregateError);
  await assert.rejects(application.close(), AggregateError);
  assert.equal(calls.databaseClosed, 1);
  assert.equal(calls.jiraClosed, 1);
});

test('HTTP close drains an active request before releasing application resources', { timeout: 5000 }, async () => {
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const { application, calls } = fixture('drain', { query: async () => { entered(); await gate; return { rows: [], rowCount: 0 }; } });
  const server = buildServer(application);
  const address = await server.listen({ host: '127.0.0.1', port: 0 });
  const request = fetch(address + '/internal/ready', { headers: { Connection: 'close' } });
  try {
    await started;
    const closing = server.close();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.databaseClosed, 0);
    release();
    const response = await request;
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ready: true });
    await closing;
    assert.equal(calls.databaseClosed, 1);
    assert.equal(calls.jiraClosed, 1);
  } finally { release(); await request; await server.close(); }
});

test('entry point imports create no clients and do not read runtime configuration', () => {
  const script = `
    import assert from 'node:assert/strict';
    import pg from 'pg';
    let pools = 0;
    const OriginalPool = pg.Pool;
    pg.Pool = class extends OriginalPool { constructor(...args) { pools++; super(...args); } };
    await import('./dist/server.js');
    await import('./dist/cli.js');
    assert.equal(pools, 0);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'invalid-on-purpose' },
  });
  assert.equal(result.status, 0, result.stderr);
});
