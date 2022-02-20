import { TaskInterface } from '@task/interfaces/task.interface';
import { TimeLogInterface } from '@task/interfaces/time-log.interface';

import { TimeLog } from './time-log.model';

export class Task implements TaskInterface {
  private _id!: string;
  private _name!: string;
  private _createDate!: Date;
  private _lastTimeLogId!: string | null;
  private _timeLogs: { [key: string]: TimeLogInterface } = {};
  private _description!: string;

  constructor(data?: Partial<TaskInterface>) {
    Object.assign(this, data);

    this.timeLogs = this.timeLogs;

    if (!this.id) {
      this.id = `task-${this.name}-${(new Date()).getTime().toString()}`;
    }

    if (!this._createDate) {
      this.createDate = new Date();
    }
  }

  public get id(): string {
    return this._id;
  }

  public set id(value: string) {
    this._id = value;
  }

  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
  }

  public get description(): string {
    return this._description;
  }

  public set description(value: string) {
    this._description = value;
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


  public get lastTimeLogId(): string | null {
    return this._lastTimeLogId;
  }

  public set lastTimeLogId(value: string | null) {
    this._lastTimeLogId = value;
  }

  public get timeLogs(): { [key: string]: TimeLogInterface } {
    return this._timeLogs;
  }

  public set timeLogs(value: { [key: string]: TimeLogInterface }) {
    if (Object.keys(value).length > 0) {
      const timeLogKeys = Object.keys(value);
      if (!(value[timeLogKeys[0]] instanceof TimeLog)) {
        timeLogKeys.forEach(
          (timeLogId: string) => value[timeLogId] = new TimeLog(value[timeLogId]),
        );
      }
    }

    this._timeLogs = value;
  }

  public startTimeLog(description?: string): string {
    if (this.lastTimeLogId) {
      throw new Error(`There is running Time Log already with ID "${this.lastTimeLogId}"!`);
    }

    const startTime = new Date();
    const timeLog = new TimeLog({
      id: startTime.getTime().toString(),
      startTime,
      description,
    });

    this.timeLogs[timeLog.id] = timeLog;

    this.lastTimeLogId = timeLog.id;

    return timeLog.id;
  }

  public stopTimeLog(id?: string): void {
    if (!id) {
      if (this.lastTimeLogId) {
        id = this.lastTimeLogId;
      }

      if (!id) {
        throw new Error('No usable Time Log id defined!');
      }
    }

    if (!this.timeLogs.hasOwnProperty(id)) {
      throw new Error(`Could not find time log for ID: "${id}" for task "${this.name}"`);
    }

    const timeLog: TimeLog = this.timeLogs[id] as TimeLog;

    timeLog.endTime = new Date();
    this.lastTimeLogId = null;
  }
}
