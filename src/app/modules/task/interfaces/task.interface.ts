import { ModelInterface } from '@core/interfaces/model.interface';

import { TaskTagsEnum } from '../enums/task-tags.enum';

import { TimeLogInterface } from './time-log.interface';

export interface TaskInterface extends ModelInterface {
  _createDate: Date;

  _name: string;
  _description?: string;

  _lastTimeLogId?: string | null;
  _timeLogged?: number;

  _timeLogs: TimeLogInterface[];

  _tags: TaskTagsEnum[];
}
