import { Column } from '@shared/interfaces/column.interface';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { columnValue } from '@shared/utils/column-value.util';

import { Task } from '@task/models/task.model';

export const columns: Column[] = [
  {
    columnDef: 'name',
    header: 'Name',
    sortable: true,
    cell: (task: Task) => columnValue(task, 'name'),
  },
  {
    columnDef: 'description',
    header: 'Description',
    sortable: true,
    cell: (task: Task) => columnValue(task, 'description'),
  },
  {
    columnDef: 'timeLogged',
    header: 'Total Time Logged',
    sortable: true,
    cell: (task: Task) => (new ReadableTimePipe())
      .transform(
        columnValue(task, 'timeLogged'),
        true,
      ),
  },
];
