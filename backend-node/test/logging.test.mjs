import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileLogStream } from '../dist/logging/file-log-stream.js';

test('host logging reopens the active file after rotation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'jira-logging-'));
  try {
    const path = join(dir, 'log-node.log');
    const stream = new FileLogStream(path);
    stream.write('before\n');
    renameSync(path, path + '.archive');
    writeFileSync(path, '');
    stream.write('after\n');
    assert.equal(readFileSync(path, 'utf8'), 'after\n');
    assert.equal(readFileSync(path + '.archive', 'utf8'), 'before\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
