import { describe, expect, it, vi } from 'vitest';

import {
  fromWallClockDateInTimezone,
  getDateTimePartsInTimezone,
  isSameCalendarDateInTimezone,
  toWallClockDateInTimezone,
} from './timezone-date.utility';

describe('Core Utils timezone-date.utility', () => {
  it('converts an instant into timezone wall-clock parts', () => {
    const instant = new Date('2026-06-02T22:00:00.000Z');

    expect(getDateTimePartsInTimezone(instant, 'Europe/Vienna')).toMatchObject({
      year: 2026,
      month: 6,
      day: 3,
      hour: 0,
      minute: 0,
      second: 0,
    });
  });

  it('maps an instant to a wall-clock date in the selected timezone', () => {
    const instant = new Date('2026-06-02T22:00:00.000Z');
    const wallClockDate = toWallClockDateInTimezone(instant, 'Europe/Vienna');

    expect(wallClockDate.getFullYear()).toBe(2026);
    expect(wallClockDate.getMonth()).toBe(5);
    expect(wallClockDate.getDate()).toBe(3);
    expect(wallClockDate.getHours()).toBe(0);
    expect(wallClockDate.getMinutes()).toBe(0);
  });

  it('maps a timezone wall-clock date back to the original UTC instant', () => {
    const wallClockDate = new Date(2026, 5, 3, 23, 59, 0, 0);
    const instant = fromWallClockDateInTimezone(wallClockDate, 'Europe/Vienna');

    expect(instant.toISOString()).toBe('2026-06-03T21:59:00.000Z');
  });

  it('compares calendar dates in the selected timezone instead of browser local time', () => {
    const left = new Date('2026-06-02T21:30:00.000Z');
    const right = new Date('2026-06-02T20:30:00.000Z');

    expect(isSameCalendarDateInTimezone(left, right, 'Europe/Vienna')).toBe(true);
    expect(isSameCalendarDateInTimezone(left, right, 'Europe/Riga')).toBe(false);
  });

  it('falls back to local date parts for invalid timezones', () => {
    const date = new Date(2026, 5, 3, 12, 34, 56);

    expect(getDateTimePartsInTimezone(date, 'Invalid/Timezone')).toMatchObject({
      year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(),
    });
  });

  it('returns the final conversion attempt when timezone iterations do not converge', () => {
    const originalIntl = globalThis.Intl;
    vi.stubGlobal('Intl', {
      ...originalIntl,
      DateTimeFormat: class {
        constructor(..._args: unknown[]) {
        }

        formatToParts(): Intl.DateTimeFormatPart[] {
          return [
            { type: 'year', value: '2000' }, { type: 'month', value: '01' }, { type: 'day', value: '01' },
            { type: 'hour', value: '00' }, { type: 'minute', value: '00' }, { type: 'second', value: '00' },
          ];
        }
      },
    });

    expect(fromWallClockDateInTimezone(new Date(2026, 5, 3, 12), 'UTC')).toBeInstanceOf(Date);
    vi.unstubAllGlobals();
  });
});
