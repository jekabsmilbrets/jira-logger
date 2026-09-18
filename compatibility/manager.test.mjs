import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// This tests command orchestration only. The Docker executable is a recording stub.
function run(action, options = [], failReady = false) {
  const root = mkdtempSync(join(tmpdir(), 'jira-manager-test-'));
  try {
    mkdirSync(join(root, '.docker/certs'), { recursive: true });
    mkdirSync(join(root, 'bin'));
    copyFileSync(resolve('manager.sh'), join(root, 'manager.sh'));
    writeFileSync(join(root, '.docker/.env'), '# fixture; never used by Docker\n');
    writeFileSync(join(root, '.docker/certs/cert.sh'), 'exit 0\n');
    const log = join(root, 'calls');
    writeFileSync(join(root, 'bin/docker'), `#!/bin/sh
printf '%s\\n' "$*" >> "$CALLS"
case "$*" in
  *'printenv POSTGRES_USER'*) echo compatibility;;
  *'printenv POSTGRES_DB'*) echo compatibility;;
  *'printenv POSTGRES_PASSWORD'*) echo disposable;;
  'ps --format'* ) echo jira-logger-db;;
  *'up -d --wait node'*) [ "$FAIL_READY" != 1 ] || exit 42;;
esac
exit 0
`, { mode: 0o755 });
    const result = spawnSync('sh', ['manager.sh', '-a', action, '-t', 'off', ...options], {
      cwd: root, encoding: 'utf8', env: { ...process.env, PATH: join(root, 'bin') + ':' + process.env.PATH, CALLS: log, FAIL_READY: failReady ? '1' : '0' },
    });
    let calls = ''; try { calls = readFileSync(log, 'utf8'); } catch {}
    return { ...result, calls };
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('all manager actions select exactly one backend and preserve action semantics', () => {
  for (const backend of ['node', 'php']) {
    for (const action of ['start', 'start-with-init', 'build', 'rebuild', 'prepare-db', 'migrate', 'seed', 'upgrade', 'down', 'db-dump', 'db-remove']) {
      const result = run(action, ['-b', '--backend', backend]);
      assert.equal(result.status, 0, `${backend} ${action}: ${result.stderr}`);
      const compose = result.calls.split('\n').filter(line => line.startsWith('compose '));
      for (const call of compose) {
        assert.ok(call.includes(`docker-compose.${backend}.yml`), call);
        assert.ok(!call.includes(`docker-compose.${backend === 'node' ? 'php' : 'node'}.yml`), call);
      }
      const maintenance = compose.filter(call => call.includes(' run --rm '));
      assert.ok(maintenance.every(call => !call.includes('--remove-orphans')));
      if (backend === 'node') assert.ok(maintenance.every(call => !call.includes('php')));
      if (action === 'start') assert.equal(maintenance.length, 0);
      if (action === 'start-with-init') assert.equal(maintenance.length, 1);
      if (['build', 'rebuild'].includes(action)) {
        assert.equal(maintenance.length, 3);
        assert.ok(result.calls.indexOf(' build') < result.calls.indexOf(' run --rm '));
        assert.ok(!compose.some(call => call.includes(' up ')));
      }
      if (action === 'upgrade') {
        assert.ok(result.calls.includes('pg_dump'));
        assert.equal(maintenance.length, 1);
        assert.ok(!result.calls.includes('seed:'));
      }
      if (action !== 'db-remove') assert.ok(!result.calls.includes('volume rm'));
    }
  }
});
test('default selection resets, -B preserves -b, and failed readiness keeps ingress down', () => {
  assert.ok(run('seed', ['-B', 'php']).calls.includes('run --rm php-fpm'));
  assert.ok(run('seed').calls.includes('run --rm node'));
  const invalid = run('start', ['--backend', 'unsupported']);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.calls, '');
  const failed = run('start', ['-b'], true);
  assert.equal(failed.status, 42);
  assert.ok(failed.calls.includes('stop -t 135 nginx'));
  assert.ok(!failed.calls.includes('up -d --wait --remove-orphans'));
});
