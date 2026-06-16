import type { TimezoneDateParts } from '@core/interfaces/timezone-date-parts.interface';

const createFormatter: (
  timezone: string,
) => Intl.DateTimeFormat = (
  timezone: string,
): Intl.DateTimeFormat => new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const getLocalDateParts: (
  date: Date,
) => TimezoneDateParts = (
  date: Date,
): TimezoneDateParts => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
  hour: date.getHours(),
  minute: date.getMinutes(),
  second: date.getSeconds(),
});

const partsToUtcMs: (
  parts: TimezoneDateParts,
) => number = (
  parts: TimezoneDateParts,
): number => Date.UTC(
  parts.year,
  parts.month - 1,
  parts.day,
  parts.hour,
  parts.minute,
  parts.second,
  0,
);

export const getDateTimePartsInTimezone: (
  date: Date,
  timezone: string,
) => TimezoneDateParts = (
  date: Date,
  timezone: string,
): TimezoneDateParts => {
  try {
    const parts: Record<string, string> = createFormatter(timezone)
      .formatToParts(date)
      .reduce<Record<string, string>>((accumulator: Record<string, string>, part: Intl.DateTimeFormatPart) => {
        if (part.type !== 'literal') {
          accumulator[part.type] = part.value;
        }

        return accumulator;
      }, {});

    return {
      year: Number(parts['year']),
      month: Number(parts['month']),
      day: Number(parts['day']),
      hour: Number(parts['hour']),
      minute: Number(parts['minute']),
      second: Number(parts['second']),
    };
  } catch {
    return getLocalDateParts(date);
  }
};

export const toWallClockDateInTimezone: (
  instant: Date,
  timezone: string,
) => Date = (
  instant: Date,
  timezone: string,
): Date => {
  const parts: TimezoneDateParts = getDateTimePartsInTimezone(instant, timezone);

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    instant.getMilliseconds(),
  );
};

export const fromWallClockDateInTimezone: (
  wallClockDate: Date,
  timezone: string,
) => Date = (
  wallClockDate: Date,
  timezone: string,
): Date => {
  const desiredParts: TimezoneDateParts = getLocalDateParts(wallClockDate);
  let utcMs: number = Date.UTC(
    desiredParts.year,
    desiredParts.month - 1,
    desiredParts.day,
    desiredParts.hour,
    desiredParts.minute,
    desiredParts.second,
    wallClockDate.getMilliseconds(),
  );

  for (let iteration: number = 0; iteration < 3; iteration += 1) {
    const actualParts: TimezoneDateParts = getDateTimePartsInTimezone(new Date(utcMs), timezone);
    const diffMs: number = partsToUtcMs(desiredParts) - partsToUtcMs(actualParts);

    if (diffMs === 0) {
      return new Date(utcMs);
    }

    utcMs += diffMs;
  }

  return new Date(utcMs);
};

export const isSameCalendarDateInTimezone: (
  left: Date,
  right: Date,
  timezone: string,
) => boolean = (
  left: Date,
  right: Date,
  timezone: string,
): boolean => {
  const leftParts: TimezoneDateParts = getDateTimePartsInTimezone(left, timezone);
  const rightParts: TimezoneDateParts = getDateTimePartsInTimezone(right, timezone);

  return leftParts.year === rightParts.year &&
    leftParts.month === rightParts.month &&
    leftParts.day === rightParts.day;
};
