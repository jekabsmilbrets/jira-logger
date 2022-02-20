import { ModelInterface } from '@core/interfaces/model.interface';

import { TimeLogInterface } from './time-log.interface';

export interface TaskInterface extends ModelInterface {
  createDate: Date;

  name: string;
  description?: string;

  lastTimeLogId?: string | null;

  timeLogs: { [key: number]: TimeLogInterface };
}
