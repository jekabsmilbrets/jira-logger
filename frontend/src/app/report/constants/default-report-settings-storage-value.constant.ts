import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsStorageValue } from '@report/interfaces/report-settings-storage-value.interface';

export const defaultReportSettingsStorageValue: ReportSettingsStorageValue = {
  reportMode: ReportMode.total,
  tags: [],
  date: null,
  startDate: null,
  endDate: null,
  showWeekends: false,
  hideUnreportedTasks: false,
};
