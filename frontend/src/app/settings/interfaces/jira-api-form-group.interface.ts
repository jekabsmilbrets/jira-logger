import { FormControl } from '@angular/forms';

import { JiraApiSettingSlugs } from '@settings/enums/jira-api-settings.enum';

export interface JiraApiFormGroup {
  [JiraApiSettingSlugs.enabled]: FormControl<boolean | null>;
  [JiraApiSettingSlugs.host]: FormControl<string | null>;
  [JiraApiSettingSlugs.personalAccessToken]: FormControl<string | null>;
}
