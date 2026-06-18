import type { Column } from '@shared/interfaces/column.interface';

import { reportBaseColumns } from './report-base-columns.constant';

export const reportDateRangeColumns: Column[] = [
  {
    ...reportBaseColumns[0],
    sticky: true,
  },
  ...reportBaseColumns.slice(1),
];
