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
const tokenPartKeys: Record<string, keyof Intl.DateTimeFormatPartTypesRegistry | 'hour'> = {
  yyyy: 'year',
  MM: 'month',
  dd: 'day',
  HH: 'hour',
  mm: 'minute',
  ss: 'second',
};
const normalizedTokenSources: Record<string, string> = {
  H: 'HH',
  m: 'mm',
  s: 'ss',
};

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
): Record<string, string> => Object.fromEntries(formatTokens.map((token: string) => {
  const paddedTokenKey: string | undefined = normalizedTokenSources[token];
  const sourceValue: string = paddedTokenKey ?
    String(Number(parts[tokenPartKeys[paddedTokenKey] ?? 'hour'] ?? '0')) :
    parts[tokenPartKeys[token] ?? 'year'] ?? '';

  return [token, sourceValue];
}));

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
