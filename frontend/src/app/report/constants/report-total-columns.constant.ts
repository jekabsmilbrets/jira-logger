import type { Column } from '@shared/interfaces/column.interface';
import { Task } from '@shared/models/task.model';
import { columnValue } from '@shared/utilities/column-value.utility';
import { reportBaseColumns } from './report-base-columns.constant';

export const reportTotalColumns: Column[] = [
  ...reportBaseColumns,
  {
    columnDef: 'timeLogged',
    header: 'Total Time Logged',
    sortable: false,
    stickyEnd: true,
    hidden: false,
    pipe: 'readableTime',
    cell: (task: Task) => columnValue(
      task,
      'timeLogged',
    ),
    hasFooter: true,
    footerCell: (tasks: Task[]) => tasks
      .map(
        (task: Task) => task.timeLogs.map(
          (t) => t.timeLogged(),
        )
          .reduce((acc, value) => acc + value, 0))
      .reduce((acc, value) => acc + value, 0),
  },
];
