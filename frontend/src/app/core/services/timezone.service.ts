import { computed, inject, Service, Signal } from '@angular/core';

import { environment } from '@environments/environment';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

@Service()
export class TimezoneService {
  private readonly settingsService: SettingsService | null = inject(SettingsService, { optional: true });
  private readonly timezoneState: Signal<string> = computed(() => this.resolveTimezone(this.settingsService?.settings()));

  public get timezone(): string {
    return this.timezoneState();
  }

  private isValidTimezone(timezone: string): boolean {
    const normalizedTimezone: string = timezone.trim();

    if (!normalizedTimezone) {
      return false;
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: normalizedTimezone });

      return true;
    } catch {
      return false;
    }
  }

  private resolveTimezone(settings: Setting[] | undefined): string {
    const timezone: string | undefined = settings?.find(
      (setting: Setting) => setting.name === JiraUserSettings.userTimeZone,
    )?.value as string | undefined;

    if (typeof timezone === 'string' && this.isValidTimezone(timezone)) {
      return timezone.trim();
    }

    return environment['appTimeZone'] as string;
  }
}
