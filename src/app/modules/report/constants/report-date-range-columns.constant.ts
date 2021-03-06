import { Column }      from '@shared/interfaces/column.interface';
import { columnValue } from '@shared/utils/column-value.util';

import { Task } from '@task/models/task.model';

export const columns: Column[] = [
  {
    columnDef: 'name',
    header: 'Name',
    sortable: true,
    visible: true,
    sticky: true,
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
];
