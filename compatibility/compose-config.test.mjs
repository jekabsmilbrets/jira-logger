import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('all backend, ingress and logging combinations resolve without phantom services', () => {
  for (const backend of ['node', 'php']) for (const traefik of [true, false]) for (const logs of [true, false]) {
    const files = ['docker-compose.yml', 'docker-compose.dev.yml', `docker-compose.${backend}.yml`];
    if (logs) files.push('docker-compose.host-logs.yml', `docker-compose.${backend}.host-logs.yml`);
    if (traefik) files.push('docker-compose-traefik.yml', `docker-compose.${backend}.traefik.yml`);
    else files.push(`docker-compose.${backend}.no-traefik.yml`);
    if (traefik && logs) files.push('docker-compose-traefik.host-logs.yml');
    const result = spawnSync('docker', ['compose', '--env-file', 'compatibility/docker.env', ...files.flatMap(file => ['-f', '.docker/' + file]), 'config', '--format', 'json'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const { services } = JSON.parse(result.stdout);
    assert.equal(Boolean(services.nginx), backend === 'php');
    assert.equal(Boolean(services['php-fpm']), backend === 'php');
    assert.equal(Boolean(services.node), backend === 'node');
    assert.equal(Boolean(services.traefik), traefik);
    assert.equal(Boolean(services['log-governor']), logs);
    const ingress = services[backend === 'node' ? 'node' : 'nginx'];
    if (traefik) {
      assert.equal(String(ingress.labels['traefik.enable']), 'true');
      assert.equal(ingress.labels[`traefik.http.services.jira-logger-${backend === 'node' ? 'node' : 'nginx'}.loadbalancer.server.port`], backend === 'node' ? '3000' : '80');
      assert.equal(ingress.ports, undefined);
    } else {
      assert.ok(ingress.ports.some(port => String(port.published) === '443'));
      if (backend === 'node') assert.ok(ingress.environment.TLS_KEY_FILE);
    }
    if (backend === 'node') {
      assert.ok(services.node.healthcheck.test.join(' ').includes('127.0.0.1:3001'));
      assert.ok(!services.node.ports?.some(port => port.target === 3001));
      assert.equal(services.node.depends_on['assets-init'].condition, 'service_completed_successfully');
    }
  }
});
