import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, openSync, closeSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpsRequest } from 'node:https';

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
  writeFileSync(manager, readFileSync(manager, 'utf8').replace('PROJECT_NAME="jira-logger"', `PROJECT_NAME="${project}"`).replaceAll('jira-logger_dbData', `${project}_dbData`).replaceAll('network inspect traefik', `network inspect ${project}-traefik`).replaceAll('network create traefik', `network create ${project}-traefik`));
  // Only deployment identities/ports change; manager action code remains intact.
  for (const name of readdirSync(join(directory, '.docker')).filter(name => name.endsWith('.yml'))) {
    const path = join(directory, '.docker', name);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('container_name: "jira-logger', `container_name: "${project}`).replaceAll('.logs/jira-logger', `.logs/${project}`).replace('"15432:5432"', '"127.0.0.1:15541:5432"').replace('"80:80"', '"127.0.0.1:18085:80"').replace('"443:443"', '"127.0.0.1:18445:443"').replace('"443:3000"', '"127.0.0.1:18445:3000"').replaceAll('Host(`jira-logger.io`)', `Host(\`${project}.invalid\`)`));
  }
  const traefikCompose = join(directory, '.docker/docker-compose-traefik.yml');
  writeFileSync(traefikCompose, readFileSync(traefikCompose, 'utf8').replaceAll('jira-logger-', `${project}-`).replace('Host(`jira-logger.io`)', `Host(\`${project}.invalid\`)`).replace('external: true', `name: ${project}-traefik\n    external: true`));
  const traefikConfig = join(directory, '.docker/traefik.yaml');
  writeFileSync(traefikConfig, readFileSync(traefikConfig, 'utf8').replace('network: traefik', `network: ${project}-traefik\n    constraints: 'Label(\`com.docker.compose.project\`, \`${project}\`)'`));
  writeFileSync(join(directory, '.docker', '.env'), readFileSync(join(root, 'compatibility/docker.env'), 'utf8').replace('API_HOST=http://127.0.0.1:18084', 'API_HOST=https://localhost:18445'));
  // Generate fixture-only certs without reading any deployed private keys.
  const certDir = join(directory, '.docker', 'certs');
  mkdirSync(certDir, { recursive: true });
  assert.equal(spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(certDir, 'jira-logger.io.key'), '-out', join(certDir, 'jira-logger.io.crt'), '-subj', '/CN=localhost', '-days', '1'], { stdio: ['ignore', logFd, logFd] }).status, 0);
  function run(action, backend = 'node', ...extra) {
    const result = spawnSync('bash', ['manager.sh', '-a', action, '--backend', backend, '-t', 'off', ...extra], { cwd: directory, stdio: ['ignore', logFd, logFd], timeout: 300000 });
    assert.equal(result.status, 0, `${backend} ${action} failed; inspect ${log}`);
    console.log(`${backend} ${action}: passed`);
  }
  function https(method, path, body, host = 'localhost') {
    return new Promise((resolve, reject) => {
      const req = httpsRequest({ hostname: '127.0.0.1', port: 18445, servername: 'localhost', ca: readFileSync(join(certDir, 'jira-logger.io.crt')), path, method,
        headers: { Host: host, Accept: 'application/json', 'Content-Type': 'application/json', Connection: 'close' } }, response => {
        let text = ''; response.on('data', chunk => { text += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body: text, headers: response.headers }));
      });
      req.on('error', reject); req.end(body && JSON.stringify(body));
    });
  }
  async function request(method, path, body) {
    const response = await https(method, '/api/' + path, body);
    return { status: response.status, body: response.status === 204 ? null : JSON.parse(response.body) };
  }
  let id;
  try {
    for (const backend of ['node', 'php']) {
      run('build', backend);
      run('start', backend, '-b', '-l', 'on');
      const running = spawnSync('docker', ['ps', '--filter', `label=com.docker.compose.project=${project}`, '--format', '{{.Label "com.docker.compose.service"}}'], { encoding: 'utf8' });
      assert.equal(running.status, 0, running.stderr);
      assert.equal(running.stdout.split('\n').includes('nginx'), backend === 'php');
      for (const path of ['/api/monitor', '/ng/runtime-config.json', '/report/date/2026-06-06']) assert.equal((await https('GET', path)).status, 200, path);
      if (backend === 'node') {
        for (const path of ['/internal/ready', '/index.php']) assert.equal((await https('GET', path)).status, 404, path);
        const uid = spawnSync('docker', ['exec', project + '-node', 'node', '-e', "console.log(require('fs').readFileSync('/proc/1/status','utf8').match(/^Uid:.*$/m)[0])"], { encoding: 'utf8' });
        assert.match(uid.stdout, /Uid:\s+1000\s+1000/);
      }
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
    run('start', 'node', '-b');
    assert.equal((await request('GET', 'task/' + id)).body.data.description, 'php');
    run('start', 'php', '-b');
    assert.equal((await request('GET', 'task/' + id)).body.data.description, 'php');
    run('start', 'node', '-b');
    const envFile = join(directory, '.docker/.env');
    const goodEnv = readFileSync(envFile, 'utf8');
    writeFileSync(envFile, goodEnv.replace('@db/compatibility?', '@db/fixture_missing_database?'));
    const failed = spawnSync('bash', ['manager.sh', '-a', 'start', '-b', '-t', 'off'], { cwd: directory, stdio: ['ignore', logFd, logFd], timeout: 90000 });
    assert.notEqual(failed.status, 0, 'unready Node must fail startup');
    await assert.rejects(https('GET', '/api/monitor'), 'failed Node readiness must leave HTTPS closed');
    writeFileSync(envFile, goodEnv);
    run('start', 'node', '-b', '-t', 'on');
    for (const path of ['/api/monitor', '/ng/runtime-config.json', '/report/date/2026-06-06']) {
      const get = () => https('GET', path, undefined, project + '.invalid');
      // Docker provider discovery can lag the Traefik process health check.
      let result = await get();
      for (let attempt = 0; result.status === 404 && attempt < 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = await get();
      }
      assert.equal(result.status, 200, path);
      if (path === '/api/monitor') assert.equal(JSON.parse(result.body).data.message, 'Welcome to Jira-logger API!');
      if (path.startsWith('/report/')) assert.ok(result.body.includes('<html'));
    }
    assert.equal(spawnSync('docker', ['ps', '-q', '--filter', `label=com.docker.compose.project=${project}`, '--filter', 'label=com.docker.compose.service=nginx'], { encoding: 'utf8' }).stdout.trim(), '');
    const traefikStartedAt = () => {
      const result = spawnSync('docker', ['inspect', '--format', '{{.State.StartedAt}}', project + '-traefik'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    const startedAt = traefikStartedAt();
    run('start', 'php', '-b', '-t', 'on');
    assert.equal(traefikStartedAt(), startedAt, 'shared Traefik must not restart when it remains enabled');
    let phpMonitor = await https('GET', '/api/monitor', undefined, project + '.invalid');
    for (let attempt = 0; phpMonitor.status === 404 && attempt < 10; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      phpMonitor = await https('GET', '/api/monitor', undefined, project + '.invalid');
    }
    assert.equal(phpMonitor.status, 200);
    console.log('real failed readiness and isolated Traefik HTTPS: passed');
    run('down');
    run('db-remove');
    assert.notEqual(spawnSync('docker', ['volume', 'inspect', `${project}_dbData`], { stdio: 'ignore' }).status, 0);
    assert.ok(existsSync(join(directory, '.logs', project, 'archive')));
  } finally {
    spawnSync('docker', ['compose', '-p', project, '--env-file', '.docker/.env', '-f', '.docker/docker-compose.yml', '-f', '.docker/docker-compose.dev.yml', '-f', '.docker/docker-compose.node.yml', '-f', '.docker/docker-compose-traefik.yml', 'down', '--remove-orphans', '--volumes'], { cwd: directory, stdio: ['ignore', logFd, logFd] });
    spawnSync('docker', ['network', 'rm', project + '-traefik'], { stdio: ['ignore', logFd, logFd] });
    closeSync(logFd);
  }
});
