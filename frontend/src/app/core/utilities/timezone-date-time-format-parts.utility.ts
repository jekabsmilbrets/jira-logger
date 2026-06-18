export const getTimeZoneFormatParts: (
  formatter: Intl.DateTimeFormat,
  date: Date,
) => Record<string, string> = (
  formatter: Intl.DateTimeFormat,
  date: Date,
): Record<string, string> => formatter
  .formatToParts(date)
  .reduce<Record<string, string>>((accumulator: Record<string, string>, part: Intl.DateTimeFormatPart) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});
