import { describe, expect, it } from 'vitest';

import { formatDateInTimezone } from './format-date-in-timezone.utility';

describe('format-date-in-timezone.utility', () => {
  it('formats dates using timezone-aware replacements', () => {
    const result = formatDateInTimezone(
      '2026-06-02T22:00:00.000Z',
      'yyyy-MM-dd HH:mm:ss',
      'en-CA',
      'Europe/Vienna',
    );

    expect(result).toBe('2026-06-03 00:00:00');
  });

  it('supports single-digit hour, minute, and second tokens', () => {
    const result = formatDateInTimezone(
      '2026-06-02T22:03:04.000Z',
      'H:m:s',
      'en-CA',
      'Europe/Vienna',
    );

    expect(result).toBe('0:3:4');
  });

  it('returns an empty string for invalid date input', () => {
    expect(formatDateInTimezone('not-a-date', 'yyyy-MM-dd', 'en-CA', 'UTC')).toBe('');
  });

  it('falls back to Intl formatting when timezone formatting parts throw', () => {
    const result = formatDateInTimezone(
      '2026-06-02T22:00:00.000Z',
      'yyyy-MM-dd',
      'en-CA',
      'Invalid/Timezone',
    );

    expect(result).toContain('2026');
  });
});
