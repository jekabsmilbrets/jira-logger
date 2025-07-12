import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

const {
  enabled,
  host,
  personalAccessToken,
} = JiraApiSettings;

export interface JiraApiFormGroupData {
  [enabled]: boolean;
  [host]: string;
  [personalAccessToken]: string;
}
