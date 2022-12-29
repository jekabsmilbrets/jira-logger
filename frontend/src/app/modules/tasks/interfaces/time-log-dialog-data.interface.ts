import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogListDialogDataInterface } from '@tasks/interfaces/time-log-list-dialog-data.interface';


export interface TimeLogDialogDataInterface extends TimeLogListDialogDataInterface {
  timeLog: TimeLog;
}
