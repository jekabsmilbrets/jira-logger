import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

export const JIRA_API_FORM_KEYS = {
  enabled: 'enabled',
  host: 'host',
  personalAccessToken: 'personalAccessToken',
} as const;

export type JiraApiFormKey = typeof JIRA_API_FORM_KEYS[keyof typeof JIRA_API_FORM_KEYS];

export const JIRA_API_FORM_TO_SETTING: Record<JiraApiFormKey, JiraApiSettings> = {
  [JIRA_API_FORM_KEYS.enabled]: JiraApiSettings.enabled,
  [JIRA_API_FORM_KEYS.host]: JiraApiSettings.host,
  [JIRA_API_FORM_KEYS.personalAccessToken]: JiraApiSettings.personalAccessToken,
};

export const USER_SETTINGS_FORM_KEYS = {
  userTimeZone: 'userTimeZone',
  locale: 'locale',
} as const;

export type UserSettingsFormKey = typeof USER_SETTINGS_FORM_KEYS[keyof typeof USER_SETTINGS_FORM_KEYS];

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
