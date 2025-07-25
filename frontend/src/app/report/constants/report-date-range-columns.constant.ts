import { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { columnValue } from '@shared/utils/column-value.util';

export const columns: Column[] = [
  {
    columnDef: 'name',
    header: 'Name',
    sortable: true,
    hidden: false,
    sticky: true,
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
    cell: (task: Task) => columnValue(
      task,
      'tags').map((t: Tag) => t.name,
    ),
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
