import { DialogData } from '@shared/interfaces/dialog-data.interface';

import { Task } from '@task/models/task.model';

export interface ErrorDialogDataInterface extends DialogData {
  errorTitle: string;
  errorMessage?: string;
  idbData: Task[];
}
