import { TimeLogInterface } from './time-log.interface';

export interface TaskInterface {
  createDate: Date;

  name: string;

  lastTimeLogId?: number;

  timeLogs: { [key: number]: TimeLogInterface };
}
