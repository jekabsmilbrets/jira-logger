import { describe, expect, it } from 'vitest';

import { getTimeZoneFormatParts } from './timezone-date-time-format-parts.utility';

describe('timezone-date-time-format-parts.utility', () => {
  it('collects non-literal parts from Intl.DateTimeFormat', () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Vienna',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const result = getTimeZoneFormatParts(
      formatter,
      new Date('2026-06-02T22:03:04.000Z'),
    );

    expect(result).toMatchObject({
      year: '2026',
      month: '06',
      day: '03',
      hour: '00',
      minute: '03',
      second: '04',
    });
    expect(result['literal']).toBeUndefined();
  });
});
