import { DateTime }              from 'luxon';

import type { SettingsStore } from '@features/settings/settings.types';

import type { TimezoneProvider } from '@time/time.types';


export class TimezoneService implements TimezoneProvider {
  constructor(
    private readonly settings: Pick<SettingsStore, 'value'>,
    private readonly fallback: string,
  ) {
  }

  public async userTimezone(): Promise<string> {
    const value: string | undefined = await this.settings.value('jira.user-time-zone');

    return typeof value === 'string' && value.trim() && DateTime.now().setZone(value).isValid ? value : this.fallback;
  }
}
