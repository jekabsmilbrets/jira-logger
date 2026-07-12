import { Service } from '@angular/core';

import { Setting } from '@core/models/setting.model';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { UserSettingsFormValue } from '@settings/interfaces/user-settings-form-value.interface';
import { buildChangedSetting, getStringSettingValue } from '@settings/utilities/find-setting-by-name.utility';

@Service()
export class UserPreferencesAdapter {
  public toFormValue(
    settings: Setting[],
  ): UserSettingsFormValue {
    return {
      timezone: this.getSettingValue(settings, JiraUserSettings.userTimeZone, ''),
      locale: this.getSettingValue(settings, JiraUserSettings.locale, 'lv-LV'),
    };
  }

  public changedSettings(
    settings: Setting[],
    formValue: UserSettingsFormValue,
  ): Setting[] {
    return [
      this.buildChangedSetting(settings, JiraUserSettings.userTimeZone, formValue.timezone),
      this.buildChangedSetting(settings, JiraUserSettings.locale, formValue.locale),
    ].filter((setting: Setting | undefined): setting is Setting => setting !== undefined);
  }

  private getSettingValue(
    settings: Setting[],
    name: JiraUserSettings,
    defaultValue: string,
  ): string {
    return getStringSettingValue(settings, name, defaultValue);
  }

  private buildChangedSetting(
    settings: Setting[],
    name: JiraUserSettings,
    nextValue: string,
  ): Setting | undefined {
    return buildChangedSetting(settings, name, nextValue, this.getSettingValue(settings, name, ''));
  }
}
