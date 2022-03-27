import { DialogData } from '@shared/interfaces/dialog-data.interface';

import { Task } from '@task/models/task.model';

export interface TasksSettingsDialogDataInterface extends DialogData {
  currentTasks: Task[];
}
