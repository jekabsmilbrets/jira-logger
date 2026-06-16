import { Tag } from '@shared/models/tag.model';

import type { ReportMode } from '@report/enums/report-mode.enum';

export interface ReportSettings {
  reportMode: ReportMode;
  tags: Tag[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
}
