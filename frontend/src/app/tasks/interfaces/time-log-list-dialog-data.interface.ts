import { Task } from '@shared/models/task.model';
import { DialogData } from '@shared/types/dialog-data.type';

export interface TimeLogListDialogDataInterface extends DialogData {
  task: Task;
}
