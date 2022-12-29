import { TimeLog } from '@shared/models/time-log.model';


export interface TimeLogsModalResponseInterface {
  created: TimeLog[];
  updated: TimeLog[];
  deleted: TimeLog[];
}
