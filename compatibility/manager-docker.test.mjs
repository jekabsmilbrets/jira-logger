import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, openSync, closeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

test('real manager actions and bidirectional switching preserve disposable data', { skip: process.env.RUN_DOCKER_MANAGER_ACCEPTANCE !== '1', timeout: 900000 }, async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const directory = mkdtempSync(join(tmpdir(), 'jira-manager-acceptance-'));
  const project = 'jira-manager-acceptance-' + Date.now();
  const log = join(directory, 'execution.log');
  const logFd = openSync(log, 'a');
  console.log(`Isolated manager project: ${project}; evidence: ${log}`);
  for (const path of ['.docker', 'backend', 'backend-node', 'frontend', '.dockerignore', 'manager.sh']) {
    cpSync(join(root, path), join(directory, path), { recursive: true, filter: source => {
      const name = basename(source);
      return !['node_modules', 'vendor', 'var', 'dist', '.angular', '.env', '.env.local', '.env.local.php'].includes(name) && !/\.(key|crt|pem)$/.test(name);
    } });
  }
  const manager = join(directory, 'manager.sh');
  writeFileSync(manager, readFileSync(manager, 'utf8').replace('PROJECT_NAME="jira-logger"', `PROJECT_NAME="${project}"`).replaceAll('jira-logger_dbData', `${project}_dbData`));
  // Only deployment identities/ports change; manager action code remains intact.
  for (const name of readdirSync(join(directory, '.docker')).filter(name => name.endsWith('.yml'))) {
    const path = join(directory, '.docker', name);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('container_name: "jira-logger', `container_name: "${project}`).replaceAll('.logs/jira-logger', `.logs/${project}`).replace('"15432:5432"', '"127.0.0.1:15541:5432"').replace('"80:80"', '"127.0.0.1:18085:80"').replace('"443:443"', '"127.0.0.1:18445:443"'));
  }
  writeFileSync(join(directory, '.docker', '.env'), readFileSync(join(root, 'compatibility/docker.env'), 'utf8').replaceAll('18084', '18085'));
  // Generate fixture-only certs without reading any deployed private keys.
  const certDir = join(directory, '.docker', 'certs');
  mkdirSync(certDir, { recursive: true });
  assert.equal(spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(certDir, 'jira-logger.io.key'), '-out', join(certDir, 'jira-logger.io.crt'), '-subj', '/CN=localhost', '-days', '1'], { stdio: ['ignore', logFd, logFd] }).status, 0);
  function run(action, backend = 'node', ...extra) {
    const result = spawnSync('bash', ['manager.sh', '-a', action, '--backend', backend, '-t', 'off', ...extra], { cwd: directory, stdio: ['ignore', logFd, logFd], timeout: 300000 });
    assert.equal(result.status, 0, `${backend} ${action} failed; inspect ${log}`);
    console.log(`${backend} ${action}: passed`);
  }
  async function request(method, path, body) {
    // Synchronous manager runs can leave old socket-close events queued across restarts.
    const response = await fetch('http://127.0.0.1:18085/api/' + path, { method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Connection: 'close' }, body: body && JSON.stringify(body) });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }
  let id;
  try {
    for (const backend of ['node', 'php']) {
      run('build', backend);
      run('start', backend, '-b', '-l', 'on');
      if (!id) {
        const created = await request('POST', 'task', { name: 'manager-switch-fixture' });
        assert.equal(created.status, 200); id = created.body.data.id;
      }
      assert.equal((await request('GET', 'task/' + id)).body.data.name, 'manager-switch-fixture');
      assert.equal((await request('PATCH', 'task/' + id, { name: 'manager-switch-fixture', description: backend })).status, 200);
      run('db-dump', backend);
      assert.ok(readFileSync(join(directory, 'db_dump.sql'), 'utf8').includes('manager-switch-fixture'));
      run('migrate', backend);
      run('prepare-db', backend);
      run('seed', backend);
      run('start-with-init', backend, '-b', '-l', 'on');
      run('upgrade', backend, '-b');
      assert.ok(readdirSync(directory).some(name => name.startsWith('db_dump.pre-upgrade.')));
      run('rebuild', backend);
      run('start', backend, '-b');
      assert.equal((await request('GET', 'task/' + id)).body.data.description, backend);
    }
    run('build');
    run('start', 'node', '-b');
    assert.equal((await request('GET', 'task/' + id)).body.data.description, 'php');
    run('down');
    run('db-remove');
    assert.notEqual(spawnSync('docker', ['volume', 'inspect', `${project}_dbData`], { stdio: 'ignore' }).status, 0);
    assert.ok(existsSync(join(directory, '.logs', project, 'archive')));
  } finally {
    spawnSync('docker', ['compose', '-p', project, '--env-file', '.docker/.env', '-f', '.docker/docker-compose.yml', '-f', '.docker/docker-compose.dev.yml', '-f', '.docker/docker-compose.node.yml', '-f', '.docker/docker-compose.no-traefik.yml', 'down', '--remove-orphans', '--volumes'], { cwd: directory, stdio: ['ignore', logFd, logFd] });
    closeSync(logFd);
  }
});
