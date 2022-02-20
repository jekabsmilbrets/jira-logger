import { TaskInterface } from '../interfaces/task.interface';
import { TimeLogs } from '../types/time-logs.type';

import { TimeLog } from './time-log.model';

export class Task implements TaskInterface {
  private _name!: string;

  private _createDate!: Date;

  private _lastTimeLogId!: number;
  private _timeLogs: TimeLogs = {};

  constructor(data?: Partial<TaskInterface>) {
    Object.assign(this, data);

    if (!this._createDate) {
      this.createDate = new Date();
    }
  }

  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
  }


  public get createDate(): Date {
    if (!this._createDate) {
      this.createDate = new Date();
    }

    return this._createDate;
  }

  public set createDate(value: Date) {
    this._createDate = value;
  }


  public get lastTimeLogId(): number {
    return this._lastTimeLogId;
  }

  public set lastTimeLogId(value: number) {
    this._lastTimeLogId = value;
  }

  public get timeLogs(): TimeLogs {
    return this._timeLogs;
  }

  public set timeLogs(value: TimeLogs) {
    this._timeLogs = value;
  }

  public startTimeLog(description?: string): number {
    const startTime = new Date();
    const timeLog = new TimeLog({
      id: startTime.getTime(),
      startTime,
      description,
    });

    this.timeLogs[timeLog.id] = timeLog;

    this.lastTimeLogId = timeLog.id;

    return timeLog.id;
  }

  public stopTimeLog(id?: number): void {
    if (!id) {
      id = this.lastTimeLogId;
    }

    if (!this.timeLogs.hasOwnProperty(id)) {
      throw new Error(`Could not find time log for ID: "${id}" for task "${this.name}"`);
    }

    const timeLog: TimeLog = this.timeLogs[id];

    timeLog.endTime = new Date();
  }
}
