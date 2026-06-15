import { JIRA_API_FORM_KEYS } from '@settings/utilities/settings-form-mapping.utility';

export type JiraApiFormKey = typeof JIRA_API_FORM_KEYS[keyof typeof JIRA_API_FORM_KEYS];
