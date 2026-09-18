import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, statSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('log governor enforces 50 MiB on startup and the next 30-second scan', { timeout: 45000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'jira-log-cap-'));
  const file = join(directory, 'log-fixture.log');
  const cap = 52428800;
  const content = Buffer.alloc(cap + 4096, 'x');
  content.write('newest', content.length - 6);
  writeFileSync(file, content);
  const child = spawn('sh', ['.docker/logging/log-cap-governor.sh'], { env: { ...process.env, LOG_DIR: directory, LOG_SCAN_INTERVAL_SEC: '30' }, stdio: 'ignore' });
  const closed = new Promise(resolve => child.on('exit', resolve));
  async function capped(timeout) {
    const deadline = Date.now() + timeout;
    while (statSync(file).size !== cap && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(statSync(file).size, cap);
    assert.equal(readFileSync(file).subarray(-6).toString(), 'newest');
  }
  try {
    await capped(5000);
    writeFileSync(file, content);
    await capped(35000);
  } finally {
    child.kill('SIGTERM');
    await closed;
    rmSync(directory, { recursive: true });
  }
});
