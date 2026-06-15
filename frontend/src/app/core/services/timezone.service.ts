import { effect, inject, Service } from '@angular/core';

import { environment } from '@environments/environment';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

@Service()
export class TimezoneService {
  private readonly settingsService: SettingsService | null = inject(SettingsService, { optional: true });

  private _timezone: string = environment['appTimeZone'] as string;

  public get timezone(): string {
    return this._timezone;
  }

  constructor() {
    this.applyTimezoneFromSettings(this.settingsService?.settings());

    effect(() => {
      this.applyTimezoneFromSettings(this.settingsService?.settings());
    });
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

  private applyTimezoneFromSettings(settings: Setting[] | undefined): void {
    const timezone: string | undefined = settings?.find(
      (setting: Setting) => setting.name === JiraUserSettings.userTimeZone,
    )?.value as string | undefined;

    if (typeof timezone === 'string' && this.isValidTimezone(timezone)) {
      this._timezone = timezone.trim();
      return;
    }

    this._timezone = environment['appTimeZone'] as string;
  }
}
