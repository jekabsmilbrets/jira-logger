import { getTimeZoneFormatParts } from './timezone-date-time-format-parts.utility';

const formatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
};

const formatTokens: string[] = ['yyyy', 'MM', 'dd', 'HH', 'H', 'mm', 'm', 'ss', 's'];

const normalizeDateInput: (
  value: Date | string | number,
) => Date | null = (
  value: Date | string | number,
): Date | null => {
  const date: Date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ?
    null :
    date;
};

const toTokenValues: (
  parts: Record<string, string>,
) => Record<string, string> = (
  parts: Record<string, string>,
): Record<string, string> => {
  const paddedValues: Record<string, string> = {
    yyyy: parts['year'] ?? '',
    MM: parts['month'] ?? '',
    dd: parts['day'] ?? '',
    HH: parts['hour'] ?? '',
    mm: parts['minute'] ?? '',
    ss: parts['second'] ?? '',
  };

  return {
    ...paddedValues,
    H: String(Number(paddedValues['HH'] ?? '0')),
    m: String(Number(paddedValues['mm'] ?? '0')),
    s: String(Number(paddedValues['ss'] ?? '0')),
  };
};

const replaceFormatTokens: (
  format: string,
  replacements: Record<string, string>,
) => string = (
  format: string,
  replacements: Record<string, string>,
): string => formatTokens.reduce(
  (output: string, token: string) => output.replaceAll(token, replacements[token] ?? token),
  format,
);

const formatWithTimezoneParts: (
  date: Date,
  locale: string,
  timezone: string,
  format: string,
) => string = (
  date: Date,
  locale: string,
  timezone: string,
  format: string,
): string => {
  const parts: Record<string, string> = getTimeZoneFormatParts(new Intl.DateTimeFormat(locale, {
    ...formatOptions,
    timeZone: timezone,
  }), date);

  return replaceFormatTokens(format, toTokenValues(parts));
};

const formatWithFallbackIntl: (
  date: Date,
  locale: string,
) => string = (
  date: Date,
  locale: string,
): string => new Intl.DateTimeFormat(locale, formatOptions).format(date);

export const formatDateInTimezone: (
  value: Date | string | number,
  format: string,
  locale: string,
  timezone: string,
) => string = (
  value: Date | string | number,
  format: string,
  locale: string,
  timezone: string,
): string => {
  const date: Date | null = normalizeDateInput(value);

  if (!date) {
    return '';
  }

  try {
    return formatWithTimezoneParts(date, locale, timezone, format);
  } catch {
    return formatWithFallbackIntl(date, locale);
  }
};
