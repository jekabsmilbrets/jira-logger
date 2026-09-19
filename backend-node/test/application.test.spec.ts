import assert                                               from 'node:assert/strict';
import { spawnSync }                                        from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpsRequest }                          from 'node:https';
import { tmpdir }                                           from 'node:os';
import { join }                                             from 'node:path';

import { buildServer, startServer }                         from '@server';
import { test }                                             from 'vitest';

import { Application }   from '@application/application';
import { Configuration } from '@application/configuration';

import { Database } from '@database/database';


function fixture(
  name,
  options = {},
) {
  const calls = {
    queries: 0,
    databaseClosed: 0,
    jiraClosed: 0
  };
  const pool = {
    query: async (
      sql,
    ) => {
      calls.queries++;

      if (options.query) {
        return options.query(sql);
      }

      return {
        rows: [{
          id: name,
          name: 'fixture.name',
          value: name
        }],
        rowCount: 1
      };
    },
    connect: async () => {
      throw new Error('Unexpected transaction');
    },
    end: async () => {
      calls.databaseClosed++;

      if (options.failClose) {
        throw new Error('fixture close');
      }
    }
  };
  const jira = {
    session: async () => {
      throw new Error('Unexpected Jira request');
    },
    close: async () => {
      calls.jiraClosed++;
    }
  };
  const application = new Application(new Configuration(options.environment ?? {}), {
    database: new Database(pool),
    jira
  });

  return {
    application,
    calls
  };
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
  } finally {
    await a.close();
    await b.close();
  }
});

test('cleanup closes Jira even when the database close fails', async () => {
  const { application, calls } = fixture('failure', {
    failClose: true
  });
  await assert.rejects(application.close(), AggregateError);
  await assert.rejects(application.close(), AggregateError);
  assert.equal(calls.databaseClosed, 1);
  assert.equal(calls.jiraClosed, 1);
});

test('readiness is not exposed on the public server and failed startup closes resources', async () => {
  const { application, calls } = fixture('unavailable', {
    query: async () => {
      throw new Error('private connection details');
    }
  });
  const server = buildServer(application);

  try {
    const response = await server.inject('/internal/ready');
    assert.equal(response.statusCode, 404);
    assert.equal(calls.queries, 0);
  } finally {
    await server.close();
  }

  const failed = fixture('startup', {
    environment: {
      PORT: '0',
      HEALTH_PORT: '0'
    },
    query: async () => {
      throw new Error('unavailable');
    }
  });
  await assert.rejects(startServer(failed.application), /unavailable/);
  assert.equal(failed.calls.databaseClosed, 1);
  assert.equal(failed.calls.jiraClosed, 1);
});

test('HTTP close drains an active request before releasing application resources', {
  timeout: 5000
}, async () => {
  let entered, release;
  const started = new Promise(
    (
      resolve,
    ) => {
      entered = resolve;
    },
  );
  const gate = new Promise(
    (
      resolve,
    ) => {
      release = resolve;
    },
  );
  const { application, calls } = fixture('drain', {
    query: async () => {
      entered();
      await gate;

      return {
        rows: [{
          id: 'fixture',
          name: 'plain.name',
          value: 'value'
        }],
        rowCount: 1
      };
    }
  });
  const server = buildServer(application);
  const address = await server.listen({
    host: '127.0.0.1',
    port: 0
  });
  const request = fetch(address + '/api/setting', {
    headers: {
      Connection: 'close'
    }
  });

  try {
    await started;
    const closing = server.close();
    await new Promise(
      (
        resolve,
      ) => setImmediate(resolve,
      ));
    assert.equal(calls.databaseClosed, 0);
    release();
    const response = await request;
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data[0].value, 'value');
    await closing;
    assert.equal(calls.databaseClosed, 1);
    assert.equal(calls.jiraClosed, 1);
  } finally {
    release();
    await request;
    await server.close();
  }
});

test('Node serves static assets and SPA routes without exposing private paths', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-static-'));
  writeFileSync(join(directory, 'index.html'), '<html>application</html>');
  writeFileSync(join(directory, 'main.js'), 'console.log("asset");');
  writeFileSync(join(directory, 'runtime-config.json'), '{"apiBase":"/api"}');
  writeFileSync(join(directory, '.env'), 'private fixture');
  writeFileSync(join(directory, 'secret.php'), 'private fixture');
  const { application } = fixture('static', {
    environment: {
      ASSETS_PATH: directory
    }
  });
  const server = buildServer(application);

  try {
    const js = await server.inject('/ng/main.js');
    assert.equal(js.statusCode, 200);
    assert.match(js.headers['content-type'], /javascript/);
    assert.equal(js.body, 'console.log("asset");');
    assert.equal((await server.inject({
      method: 'HEAD',
      url: '/ng/main.js'
    })).body, '');
    assert.equal((await server.inject({
      url: '/ng/main.js',
      headers: {
        Range: 'bytes=0-6'
      }
    })).statusCode, 206);
    assert.equal((await server.inject({
      url: '/ng/main.js',
      headers: {
        'If-None-Match': js.headers.etag
      }
    })).statusCode, 304);
    assert.deepEqual((await server.inject('/ng/runtime-config.json')).json(), {
      apiBase: '/api'
    });

    for (const path of ['/ng/missing.js', '/ng/.env', '/ng/secret.php', '/ng/secret%2ephp', '/index.php', '/internal/ready']) {
      assert.equal((await server.inject(path)).statusCode, 404, path);
    }

    for (const path of ['/report/date/2026-06-06', '/api/unknown']) {
      assert.equal((await server.inject(path)).body, '<html>application</html>');
    }

    assert.ok(!(await server.inject('/ng/%2e%2e/.env')).body.includes('private fixture'));
  } finally {
    await server.close();
    rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});

test('direct Node HTTPS serves assets using the configured certificate', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-tls-'));
  const key = join(directory, 'server.key'), cert = join(directory, 'server.crt');
  const generated = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-days', '1'], {
    encoding: 'utf8'
  });
  assert.equal(generated.status, 0, generated.stderr);
  writeFileSync(join(directory, 'index.html'), '<html>TLS</html>');
  const { application, calls } = fixture('tls', {
    environment: {
      PORT: '0',
      HEALTH_PORT: '0',
      ASSETS_PATH: directory,
      TLS_CERT_FILE: cert,
      TLS_KEY_FILE: key
    }
  });
  const server = await startServer(application);

  try {
    const response = await new Promise((
      resolve,
      reject,
    ) => {
      const req = httpsRequest({
        hostname: '127.0.0.1',
        port: server.server.address().port,
        path: '/ng/index.html',
        ca: readFileSync(cert)
      }, (
        res,
      ) => {
        let body = '';
        res.on('data', (
          chunk,
        ) => {
          body += chunk;
        });
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body
        }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(response.status, 200);
    assert.equal(response.body, '<html>TLS</html>');
    assert.match(response.headers['strict-transport-security'], /max-age/);
  } finally {
    await server.close();
    rmSync(directory, {
      recursive: true,
      force: true
    });
  }

  assert.equal(calls.databaseClosed, 1);
  assert.throws(() => new Configuration({
    TLS_KEY_FILE: '/missing.key'
  }), /Both TLS/);
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
    cwd: new URL('../', import.meta.url),
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'invalid-on-purpose'
    }
  });
  assert.equal(result.status, 0, result.stderr);
});

test('unreadable TLS configuration closes resources when server construction fails', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-missing-tls-'));
  const { application, calls } = fixture('tls-failure', {
    environment: {
      TLS_CERT_FILE: join(directory, 'missing.crt'),
      TLS_KEY_FILE: join(directory, 'missing.key')
    }
  });

  try {
    await assert.rejects(startServer(application), {
      code: 'ENOENT'
    });
    assert.equal(calls.databaseClosed, 1);
    assert.equal(calls.jiraClosed, 1);
  } finally {
    await application.close();
    rmSync(directory, {
      recursive: true,
      force: true
    });
  }
});
