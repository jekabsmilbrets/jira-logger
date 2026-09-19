import { DateTime } from 'luxon';


export function parseDate(
  value: string | null | undefined,
  zone: string,
): DateTime | null {
  if (value == null || !value.trim()) {
    return null;
  }

  value = value.trim();
  let result: DateTime;

  if (/^\d+$/.test(value)) {
    result = DateTime.fromSeconds(value.length === 13 ? Math.floor(Number(value) / 1000) : Number(value), {
      zone
    });
  } else {
    const dayFirst: RegExpExecArray | null = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

    if (dayFirst) {
      value = `${ dayFirst[3] }-${ dayFirst[2] }-${ dayFirst[1] }`;
    }

    const match: RegExpExecArray | null = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(value);

    if (!match) {
      throw new Error('Invalid date input.');
    }

    const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = '0', offset] = match;

    if (year === undefined || month === undefined || day === undefined) {
      throw new Error('Invalid date input.');
    }

    if (+month < 1 || +month > 12 || +day < 1 || +day > 31 || +hour > 24 || +minute > 59 || +second > 60) {
      throw new Error('Invalid date input.');
    }

    const wall: DateTime = DateTime.utc(+year, +month, 1).plus({
      days: +day - 1,
      hours: +hour,
      minutes: +minute,
      seconds: +second,
      milliseconds: Number(`0.${ fraction }`) * 1000
    });

    if (offset) {
      result = DateTime.fromISO(wall.toFormat('yyyy-MM-dd\'T\'HH:mm:ss.SSS') + offset, {
        setZone: true
      }).setZone(zone);
    } else {
      result = DateTime.fromObject(wall.toObject(), {
        zone
      });
      // timelib's initial offset comes from interpreting the wall clock as UTC.
      // Verified against PHP for Riga, New York, London, and Lord Howe overlaps.
      const preferredOffset: number = wall.setZone(zone).offset;
      result = result.getPossibleOffsets().find(
        (
          candidate,
        ) => candidate.offset === preferredOffset,
      ) ?? result;
    }
  }

  if (!result.isValid) {
    throw new Error('Invalid date input.');
  }

  return result;
}

export function sqlDate(
  value: DateTime,
): string {
  return value.toUTC().startOf('second').toISO()!;
}
