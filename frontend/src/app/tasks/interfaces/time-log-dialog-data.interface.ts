import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import type { DialogData } from '@shared/types/dialog-data.type';

export interface TimeLogListDialogData extends DialogData {
  task: Task;
}

export interface TimeLogDialogData extends TimeLogListDialogData {
  timeLog: TimeLog;
}
