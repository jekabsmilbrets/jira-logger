export const formatDateInTimezone = (
  value: Date | string | number,
  format: string,
  locale: string,
  timezone: string,
): string => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).reduce<Record<string, string>>((accumulator, part) => {
      if (part.type !== 'literal') {
        accumulator[part.type] = part.value;
      }

      return accumulator;
    }, {});

    const replacements: Record<string, string> = {
      yyyy: parts['year'] ?? '',
      MM: parts['month'] ?? '',
      dd: parts['day'] ?? '',
      HH: parts['hour'] ?? '',
      H: String(Number(parts['hour'] ?? '0')),
      mm: parts['minute'] ?? '',
      m: String(Number(parts['minute'] ?? '0')),
      ss: parts['second'] ?? '',
      s: String(Number(parts['second'] ?? '0')),
    };

    return format.replace(/yyyy|MM|dd|HH|H|mm|m|ss|s/g, (token) => replacements[token] ?? token);
  } catch {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }
};
