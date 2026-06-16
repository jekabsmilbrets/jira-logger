import { TimeLog } from '@shared/models/time-log.model';

import type { TimeLogListDialogData } from '@tasks/interfaces/time-log-list-dialog-data.interface';

export interface TimeLogDialogData extends TimeLogListDialogData {
  timeLog: TimeLog;
}
