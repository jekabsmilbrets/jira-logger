import { ReportModeEnum } from '@report/enums/report-mode.enum';

export interface ReportSettingsStorageValue {
  reportMode: ReportModeEnum;
  tags: string[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
}
