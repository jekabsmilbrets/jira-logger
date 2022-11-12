import { ReportModeEnum } from '@report/enums/report-mode.enum';


export const reportModes: {
  value: ReportModeEnum;
  viewValue: string;
}[] = [
  {
    value: ReportModeEnum.total,
    viewValue: 'Total',
  },
  {
    value: ReportModeEnum.date,
    viewValue: 'Date',
  },
  {
    value: ReportModeEnum.dateRange,
    viewValue: 'Date Range',
  },
];
