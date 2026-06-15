import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';

export interface ReportStateSnapshot {
  reportMode: ReportMode;
  tags: Tag[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
}
