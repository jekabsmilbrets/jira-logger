import { Service } from '@angular/core';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import type { JiraApiFormValue } from '@settings/interfaces/jira-api-form-value.interface';
import { buildChangedSetting, getBooleanLikeSettingValue } from '@settings/utilities/find-setting-by-name.utility';

@Service()
export class JiraApiSettingsAdapter {
  public toFormValue(
    settings: Setting[],
  ): JiraApiFormValue {
    return {
      enabled: this.isEnabled(settings),
      host: String(this.getSettingValue(settings, JiraApiSettings.host, '')),
      personalAccessToken: '',
    };
  }

  public hasStoredPersonalAccessToken(
    settings: Setting[],
  ): boolean {
    return !!this.getSettingValue(settings, JiraApiSettings.personalAccessToken, '');
  }

  public changedSettings(
    settings: Setting[],
    formValue: JiraApiFormValue,
  ): Setting[] {
    return [
      this.buildChangedSetting(settings, JiraApiSettings.enabled, formValue.enabled),
      this.buildChangedSetting(settings, JiraApiSettings.host, formValue.host),
      this.buildChangedSetting(settings, JiraApiSettings.personalAccessToken, formValue.personalAccessToken),
    ].filter((setting: Setting | undefined): setting is Setting => setting !== undefined);
  }

  public isEnabled(
    settings: Setting[],
  ): boolean {
    return this.getSettingValue(settings, JiraApiSettings.enabled, false) === true;
  }

  private getSettingValue(
    settings: Setting[],
    name: JiraApiSettings,
    defaultValue: string | boolean,
  ): string | boolean {
    return getBooleanLikeSettingValue(settings, name, defaultValue);
  }

  private buildChangedSetting(
    settings: Setting[],
    name: JiraApiSettings,
    value: string | boolean,
  ): Setting | undefined {
    return buildChangedSetting(
      settings,
      name,
      value,
      this.getSettingValue(settings, name, false),
      (nextValue: string | boolean) => name !== JiraApiSettings.personalAccessToken ||
        (typeof nextValue === 'string' && nextValue.trim().length > 0),
    );
  }
}
