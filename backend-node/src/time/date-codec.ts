import { DateTime } from 'luxon';


export class DateCodec {
  constructor(
    private readonly internalTimezone: string,
  ) {
  }

  public storedDate(
    value: number | string,
  ): DateTime {
    return typeof value === 'number' ? DateTime.fromMillis(value, {
      zone: 'UTC'
    }) : DateTime.fromSQL(value, {
      zone: this.internalTimezone
    });
  }

  public atom(
    value: number | string | null,
    zone: string,
  ): string | null {
    return value === null ? null : this.storedDate(value).setZone(zone).toFormat('yyyy-MM-dd\'T\'HH:mm:ssZZ');
  }
}
