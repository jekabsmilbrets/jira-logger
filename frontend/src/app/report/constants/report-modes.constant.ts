import { ReportMode } from '@report/enums/report-mode.enum';

export const reportModes: {
  value: ReportMode;
  viewValue: string;
}[] = [
  {
    value: ReportMode.total,
    viewValue: 'Total',
  },
  {
    value: ReportMode.date,
    viewValue: 'Date',
  },
  {
    value: ReportMode.dateRange,
    viewValue: 'Date Range',
  },
];
