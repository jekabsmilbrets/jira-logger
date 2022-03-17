import { getDateParts } from '@core/utils/get-date-parts.utility';

import { Searchable }   from '@shared/interfaces/searchable.interface';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { TimeLog } from './time-log.model';

export class Task implements Searchable {
  private _uuid!: string;
  private _name!: string;
  private _createDate!: number;
  private _lastTimeLogId!: string | null;
  private _timeLogs: TimeLog[] = [];
  private _description!: string;
  private _timeLogged = 0;
  private _tags: TaskTagsEnum[] = [];

  constructor(data?: Partial<Task>) {
    Object.assign(this, data);

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

  public get createDate(): Date {
    if (!this._createDate) {
      this.createDate = new Date();
    }

    return new Date(this._createDate);
  }

  public set createDate(value: Date) {
    this._createDate = value?.getTime();
  }

  public get lastTimeLogId(): string | null {
    return this._lastTimeLogId;
  }

  public set lastTimeLogId(value: string | null) {
    this._lastTimeLogId = value;
  }

  public get timeLogs(): TimeLog[] {
    return this._timeLogs;
  }

  public set timeLogs(value: TimeLog[]) {
    this._timeLogs = value;
  }

  public get description(): string {
    return this._description;
  }

  public set description(value: string) {
    this._description = value;
  }

  public get timeLogged(): number {
    return this._timeLogged;
  }

  public set timeLogged(value: number) {
    this._timeLogged = value;
  }

  public get tags(): TaskTagsEnum[] {
    return this._tags;
  }

  public set tags(value: TaskTagsEnum[]) {
    this._tags = value;
  }

  public startTimeLog(description?: string): string {
    if (this.lastTimeLogId) {
      throw new Error(`There is running Time Log already with ID "${this.lastTimeLogId}"!`);
    }

    const startTime = new Date();
    const timeLog = new TimeLog(
      {
        uuid: startTime.getTime().toString(),
        startTime,
        description,
      },
    );

    this.lastTimeLogId = timeLog.uuid;
    this.timeLogs.push(timeLog);

    return this.lastTimeLogId;
  }

  public stopTimeLog(): void {
    if (!this.lastTimeLogId) {
      return;
    }
    const timeLog: TimeLog | undefined = this.timeLogs.find(
      (tl: TimeLog) => tl.uuid === this.lastTimeLogId,
    );

    if (!timeLog) {
      const lastTimeLogId = this.lastTimeLogId;
      this.lastTimeLogId = null;
      throw new Error(`Could not find time log for ID: "${lastTimeLogId}" for task "${this.name}"`);
    }

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

  public calcTimeLoggedForDateRange(startDate: Date, endDate: Date): number {
    const [startDateYear, startDateMonth, startDateDate] = getDateParts(startDate);
    const [endDateYear, endDateMonth, endDateDate] = getDateParts(endDate);
    const timeLogs: TimeLog[] = (this.timeLogs ?? [])
      .filter(
        (timeLog: TimeLog) => {
          const [startTimeYear, startTimeMonth, startTimeDate] = getDateParts(timeLog.startTime);

          return (startTimeYear >= startDateYear && startTimeYear <= endDateYear) &&
            (startTimeMonth >= startDateMonth && startTimeMonth <= endDateMonth) &&
            (startTimeDate >= startDateDate && startTimeDate <= endDateDate);
        },
      ) ?? [];

    return this.calcTimeLogged(timeLogs);
  }

  public calcTimeLoggedForDate(date: Date): number {
    const [dateYear, dateMonth, dateDate] = getDateParts(date);

    const timeLogs: TimeLog[] = (this.timeLogs ?? [])
      .filter(
        (timeLog: TimeLog) => timeLog.startTime.getFullYear() === dateYear &&
          timeLog.startTime.getMonth() === dateMonth &&
          timeLog.startTime.getDate() === dateDate,
      ) ?? [];

    return this.calcTimeLogged(timeLogs);
  }

  private calcTimeLogged(timeLogs?: TimeLog[]): number {
    timeLogs = timeLogs ?? (this.timeLogs ?? []);

    if (timeLogs.length === 0) {
      return 0;
    }

    const filterFn = (timeLog: TimeLog) => timeLog?.endTime && timeLog?.startTime;
    const mapFn = (timeLog: TimeLog) => [
      (timeLog.endTime as Date).getTime(),
      timeLog.startTime.getTime(),
    ];

    const reduceFn = (prev: number, times: number[]) => {
      const [endTime, startTime]: number[] = [...times];

      return (
               !endTime || !startTime
             ) ? prev : Math.ceil(
        prev + ((endTime - startTime) / 1000),
      );
    };

    return (
      timeLogs.filter(filterFn)
              .map(mapFn)
              .reduce(reduceFn, 0)
    ) ?? 0;
  }
}
