import { Task } from '@shared/models/task.model';
import type { DialogData } from '@shared/types/dialog-data.type';

export interface TasksSettingsDialogData extends DialogData {
  currentTasks: Task[];
}
