import { ReportMode } from '@report/enums/report-mode.enum';

export interface ReportSettingsStorageValue {
  reportMode: ReportMode;
  tags: string[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
}
