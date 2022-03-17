import { DialogData } from '@shared/interfaces/dialog-data.interface';

import { Task } from '@task/models/task.model';

export interface TimeLogListDialogDataInterface extends DialogData {
  task: Task;
}
