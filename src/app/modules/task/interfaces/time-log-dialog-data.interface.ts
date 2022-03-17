import { TimeLogListDialogDataInterface } from '@task/interfaces/time-log-list-dialog-data.interface';
import { TimeLog }                        from '@task/models/time-log.model';

export interface TimeLogDialogDataInterface extends TimeLogListDialogDataInterface {
  timeLog: TimeLog;
}
