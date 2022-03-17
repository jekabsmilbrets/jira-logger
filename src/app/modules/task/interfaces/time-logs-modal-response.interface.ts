import { TimeLog }                  from '@task/models/time-log.model';
import { TimeLogModalResponseType } from '@task/types/time-log-modal-response.type';

export interface TimeLogsModalResponseInterface {
  responseType: TimeLogModalResponseType;
  responseData?: TimeLog[];
}
