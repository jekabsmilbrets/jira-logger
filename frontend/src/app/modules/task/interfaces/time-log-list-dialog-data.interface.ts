import { DialogData } from '@shared/interfaces/dialog-data.interface';
import { Task }       from '@shared/models/task.model';


export interface TimeLogListDialogDataInterface extends DialogData {
  task: Task;
}
