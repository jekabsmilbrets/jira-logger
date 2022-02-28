import { ModelInterface } from '@core/interfaces/model.interface';

import { TaskTagsEnum } from '../enums/task-tags.enum';

import { TimeLogInterface } from './time-log.interface';

export interface TaskInterface extends ModelInterface {
  createDate: Date;

  name: string;
  description?: string;

  lastTimeLogId?: string | null;
  timeLogged?: number;

  timeLogs: { [key: number]: TimeLogInterface };

  tags: TaskTagsEnum[];
}
