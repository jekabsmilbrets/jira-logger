import { inject, Injectable } from '@angular/core';

import { map } from 'rxjs';

import { environment } from '@environments/environment';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

@Injectable({
  providedIn: 'root',
})
export class TimezoneService {
  private readonly settingsService: SettingsService | null = inject(SettingsService, { optional: true });

  private _timezone: string = environment['appTimeZone'] as string;

  public get timezone(): string {
    return this._timezone;
  }

  constructor() {
    this.settingsService?.settings$
      .pipe(
        map((settings: Setting[]) =>
          settings.find(
            (setting: Setting) => setting.name === JiraUserSettings.userTimeZone,
          )?.value,
        ),
      )
      .subscribe((timezone: string | undefined) => {
        if (typeof timezone === 'string' && this.isValidTimezone(timezone)) {
          this._timezone = timezone.trim();
        } else {
          this._timezone = environment['appTimeZone'] as string;
        }
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
}
