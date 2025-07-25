import { FormControl } from '@angular/forms';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

export interface JiraApiFormGroup {
  [JiraApiSettings.enabled]: FormControl<boolean | null>;
  [JiraApiSettings.host]: FormControl<string | null>;
  [JiraApiSettings.personalAccessToken]: FormControl<string | null>;
}
