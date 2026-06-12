import { FormControl } from '@angular/forms';

import { JiraUserSettingSlugs } from '@settings/enums/jira-user-settings.enum';

export interface TimeZoneFormGroup {
  [JiraUserSettingSlugs.userTimeZone]: FormControl<string | null>;
  [JiraUserSettingSlugs.locale]: FormControl<string | null>;
}
