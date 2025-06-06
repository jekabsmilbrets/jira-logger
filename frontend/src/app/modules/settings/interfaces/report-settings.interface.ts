import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { Tag } from '@shared/models/tag.model';

export interface ReportSettings {
  reportMode: ReportModeEnum;
  tags: Tag[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
}
