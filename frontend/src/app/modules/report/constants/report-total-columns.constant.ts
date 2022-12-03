import { Column } from '@shared/interfaces/column.interface';
import { Tag }    from '@shared/models/tag.model';

import { Task }        from '@shared/models/task.model';
import { columnValue } from '@shared/utils/column-value.util';


export const columns: Column[] = [
  {
    columnDef: 'name',
    header: 'Name',
    sortable: true,
    visible: true,
    isClickable: true,
    cellClickType: 'string',
    footerCellClickType: 'concatenatedString',
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
    cell: (task: Task) => columnValue(task, 'tags').map((t: Tag) => t.name),
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
