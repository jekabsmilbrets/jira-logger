import { Column }      from '@shared/interfaces/column.interface';
import { columnValue } from '@shared/utils/column-value.util';

import { Task } from '@task/models/task.model';

export const columns: Column[] = [
  {
    columnDef: 'name',
    header: 'Name',
    sortable: true,
    visible: true,
    cell: (task: Task) => columnValue(task, 'name'),
    hasFooter: true,
    footerCell: () => 'Total',
  },
  {
    columnDef: 'description',
    header: 'Description',
    sortable: true,
    visible: true,
    cell: (task: Task) => columnValue(task, 'description'),
  },
  {
    columnDef: 'tags',
    header: 'Tags',
    sortable: true,
    visible: true,
    cell: (task: Task) => (columnValue(task, 'tags') as string[]).join(', '),
  },
  {
    columnDef: 'lastTimeLogStartTime',
    header: 'Last reported',
    sortable: true,
    visible: true,
    pipe: 'date',
    cell: (task: Task) => columnValue(task, 'lastTimeLogStartTime'),
  },
  {
    columnDef: 'timeLogged',
    header: 'Total Time Logged',
    sortable: false,
    stickyEnd: true,
    visible: true,
    pipe: 'readableTime',
    cell: (task: Task) => columnValue(task, 'timeLogged'),
    hasFooter: true,
    footerCell: (tasks: Task[]) => tasks.map(
                                          (task: Task) => task.timeLogs.map(t => t.timeLogged())
                                                              .reduce((acc, value) => acc + value, 0),
                                        )
                                        .reduce((acc, value) => acc + value, 0),
  },
];
