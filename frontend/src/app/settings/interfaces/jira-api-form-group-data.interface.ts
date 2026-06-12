import { JiraApiSettingSlugs } from '@settings/enums/jira-api-settings.enum';

export interface JiraApiFormGroupData {
  [JiraApiSettingSlugs.enabled]: boolean;
  [JiraApiSettingSlugs.host]: string;
  [JiraApiSettingSlugs.personalAccessToken]: string;
}
