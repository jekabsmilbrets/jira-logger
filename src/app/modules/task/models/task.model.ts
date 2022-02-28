import { Searchable } from '@shared/interfaces/searchable.interface';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { TaskInterface } from '@task/interfaces/task.interface';
import { TimeLogInterface } from '@task/interfaces/time-log.interface';

import { TimeLog } from './time-log.model';

export class Task implements TaskInterface, Searchable {
  private _uuid!: string;
  private _name!: string;
  private _createDate!: number;
  private _lastTimeLogId!: string | null;
  private _timeLogs: { [key: string]: TimeLogInterface } = {};
  private _description!: string;
  private _timeLogged = 0;
  private _tags: TaskTagsEnum[] = [];

  constructor(data?: Partial<TaskInterface>) {
    Object.assign(this, data);

    this.timeLogs = this.timeLogs;

    if (!this.uuid) {
      this.uuid = `task-${this.name}-${(new Date()).getTime().toString()}`;
    }

    if (!this._createDate) {
      this.createDate = new Date();
    }
  }

  public get uuid(): string {
    return this._uuid;
  }

  public set uuid(value: string) {
    this._uuid = value;
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

  public get tags(): TaskTagsEnum[] {
    return this._tags;
  }

  public set tags(value: TaskTagsEnum[]) {
    this._tags = value;
  }


  public get createDate(): Date {
    if (!this._createDate) {
      this.createDate = new Date();
    }

    return new Date(this._createDate);
  }

  public set createDate(value: Date) {
    this._createDate = value.getTime();
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

  public get timeLogged(): number {
    return this._timeLogged;
  }

  public set timeLogged(value: number) {
    this._timeLogged = value;
  }

  public startTimeLog(description?: string): string {
    if (this.lastTimeLogId) {
      throw new Error(`There is running Time Log already with ID "${this.lastTimeLogId}"!`);
    }

    const startTime = new Date();
    const timeLog = new TimeLog({
      uuid: startTime.getTime().toString(),
      startTime,
      description,
    });

    this.lastTimeLogId = timeLog.uuid;
    this.timeLogs[this.lastTimeLogId] = timeLog;

    return this.lastTimeLogId;
  }

  public stopTimeLog(): void {
    if (!this.lastTimeLogId) {
      return;
    }

    if (!this.timeLogs.hasOwnProperty(this.lastTimeLogId)) {
      throw new Error(`Could not find time log for ID: "${this.lastTimeLogId}" for task "${this.name}"`);
    }

    const timeLog: TimeLog = this.timeLogs[this.lastTimeLogId] as TimeLog;

    timeLog.endTime = new Date();

    this.timeLogged = this.calcTimeLogged();
    this.lastTimeLogId = null;
  }

  public addTag(tag: TaskTagsEnum): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  public removeTag(tag: TaskTagsEnum): void {
    if (this.tags.includes(tag)) {
      this.tags = this.tags.filter(eTag => eTag !== tag);
    }
  }

  private calcTimeLogged(): number {
    const timeLogs: TimeLog[] = (Object.values(this.timeLogs) as TimeLog[]) ?? [];

    return timeLogs.map(
                     (timeLog: TimeLog) => [
                       timeLog?.endTime?.getTime(),
                       timeLog?.startTime?.getTime(),
                     ],
                   )
                   .reduce(
                     (prev: number, [endTime, startTime]) => (
                       !endTime || !startTime
                     ) ? prev : Math.ceil(
                       prev + ((endTime - startTime) / 1000),
                     ),
                     0,
                   ) ?? 0;
  }
}
