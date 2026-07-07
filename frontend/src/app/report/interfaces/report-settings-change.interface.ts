import type { ParamMap } from '@angular/router';

import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';

export type ReportSettingsChange =
  | {
    type: 'intent';
    intent: ReportSettingsIntent;
  }
  | {
    type: 'route';
    paramMap: ParamMap;
  };
