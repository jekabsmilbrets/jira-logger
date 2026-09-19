import { DateTime } from 'luxon';
import type { SettingsStore } from '../features/settings/settings.types.js';
import type { TimezoneProvider } from './time.types.js';

export class TimezoneService implements TimezoneProvider {
  constructor(private readonly settings: Pick<SettingsStore, 'value'>, private readonly fallback: string) { }
  async userTimezone(): Promise<string> {
    const value = await this.settings.value('jira.user-time-zone');
    return typeof value === 'string' && value.trim() && DateTime.now().setZone(value).isValid ? value : this.fallback;
  }
}
