import { closeSync, openSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function acquireDatabaseLock(
  path: string,
): () => void {
  const lockPath: string = path + '.lock';
  closeSync(openSync(lockPath, 'a', 0o600));
  const lock: DatabaseSync = new DatabaseSync(lockPath, {
    timeout: 0
  });

  try {
    // Keep the sidecar inode: SQLite releases ownership even after SIGKILL.
    lock.exec('BEGIN EXCLUSIVE');
  } catch (error) {
    lock.close();
    throw error;
  }

  return () => lock.close();
}

export function requiredRow<T>(
  rows: T[],
): T {
  const row: T | undefined = rows[0];

  if (!row) {
    throw new Error('Expected a database row');
  }

  return row;
}

export function errorCode(
  error: unknown,
): unknown {
  if (error !== null && typeof error === 'object' && 'errcode' in error && [1555, 2067].includes(Number(error.errcode))) {
return 'unique';
}

  return error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
}
