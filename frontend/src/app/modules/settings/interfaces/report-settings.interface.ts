import { Tag }            from '@shared/models/tag.model';

import { ReportModeEnum } from '@report/enums/report-mode.enum';


export interface ReportSettings {
  reportMode: ReportModeEnum;
  tags: Tag[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
}
