import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { JiraApiFormKey } from '@settings/types/jira-api-form-key.type';
import type { UserSettingsFormKey } from '@settings/types/user-settings-form-key.type';

export const JIRA_API_FORM_KEYS: {
  readonly enabled: 'enabled';
  readonly host: 'host';
  readonly personalAccessToken: 'personalAccessToken';
} = {
  enabled: 'enabled',
  host: 'host',
  personalAccessToken: 'personalAccessToken',
} as const;

export const JIRA_API_FORM_TO_SETTING: Record<JiraApiFormKey, JiraApiSettings> = {
  [JIRA_API_FORM_KEYS.enabled]: JiraApiSettings.enabled,
  [JIRA_API_FORM_KEYS.host]: JiraApiSettings.host,
  [JIRA_API_FORM_KEYS.personalAccessToken]: JiraApiSettings.personalAccessToken,
};

export const USER_SETTINGS_FORM_KEYS: {
  readonly userTimeZone: 'userTimeZone';
  readonly locale: 'locale';
} = {
  userTimeZone: 'userTimeZone',
  locale: 'locale',
} as const;

export const USER_SETTINGS_FORM_TO_SETTING: Record<UserSettingsFormKey, JiraUserSettings> = {
  [USER_SETTINGS_FORM_KEYS.userTimeZone]: JiraUserSettings.userTimeZone,
  [USER_SETTINGS_FORM_KEYS.locale]: JiraUserSettings.locale,
};

export function getSettingNameFromJiraApiFormKey(
  key: JiraApiFormKey,
): JiraApiSettings {
  return JIRA_API_FORM_TO_SETTING[key];
}

export function getSettingNameFromUserSettingsFormKey(
  key: UserSettingsFormKey,
): JiraUserSettings {
  return USER_SETTINGS_FORM_TO_SETTING[key];
}
