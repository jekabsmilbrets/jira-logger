import { TimeLog } from '@shared/models/time-log.model';

export type TimeLogModalResponseType =
  'cancel'
  | 'update'
  | 'delete';

export interface TimeLogModalResponse {
  responseType: TimeLogModalResponseType;
  responseData?: TimeLog;
}
