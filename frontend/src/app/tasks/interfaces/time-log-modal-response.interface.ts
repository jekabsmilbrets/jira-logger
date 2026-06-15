import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogModalResponseType } from '@tasks/types/time-log-modal-response.type';

export interface TimeLogModalResponse {
  responseType: TimeLogModalResponseType;
  responseData?: TimeLog;
}
