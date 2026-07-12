import { describe, expect, it } from 'vitest';

import { normalizeBackupKey } from './task-backup-normalization.utility';

describe('Tasks Utility normalizeBackupKey', () => {
  it('trims whitespace and normalizes case', () => {
    expect(normalizeBackupKey('  Frontend  ')).toBe('frontend');
  });
});
