import { TimeLog } from '@shared/models/time-log.model';

export interface TimeLogsModalResponseInterface {
  saved: boolean;
  timeLogs?: TimeLog[];
}
