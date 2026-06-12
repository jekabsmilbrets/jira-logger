import { describe, expect, it } from 'vitest';

import {
  fromWallClockDateInTimezone,
  getDateTimePartsInTimezone,
  isSameCalendarDateInTimezone,
  toWallClockDateInTimezone,
} from './timezone-date.utility';

describe('timezone-date.utility', () => {
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
});
