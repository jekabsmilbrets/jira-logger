import type { Column } from '@shared/interfaces/column.interface';
import { Task } from '@shared/models/task.model';
import { columnValue } from '@shared/utilities/column-value.utility';

export const reportBaseColumns: Column[] = [
  {
    columnDef: 'name',
    header: 'Name',
    sortable: true,
    hidden: false,
    isClickable: true,
    cellClickType: 'string',
    footerCellClickType: 'concatenatedString',
    cell: (task: Task) => columnValue(
      task,
      'name',
    ),
    hasFooter: true,
    footerCell: () => 'Total',
  },
  {
    columnDef: 'description',
    header: 'Description',
    sortable: true,
    hidden: false,
    cell: (task: Task) => columnValue(
      task,
      'description',
    ),
  },
  {
    columnDef: 'tags',
    header: 'Tags',
    sortable: true,
    hidden: false,
    cell: (task: Task) => task.tags.map((tag) => tag.name),
  },
  {
    columnDef: 'lastTimeLogStartTime',
    header: 'Last reported',
    sortable: true,
    hidden: false,
    pipe: 'date',
    cell: (task: Task) => columnValue(
      task,
      'lastTimeLogStartTime',
    ),
  },
];
