import { TimeLog } from '@shared/models/time-log.model';

export interface TimeLogsModalResponse {
  saved: boolean;
  timeLogs?: TimeLog[];
}
