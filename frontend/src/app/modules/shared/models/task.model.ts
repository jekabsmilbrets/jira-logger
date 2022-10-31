import { Base }         from '@core/models/base.model';
import { getDateParts } from '@core/utils/get-date-parts.utility';

import { Searchable } from '@shared/interfaces/searchable.interface';
import { Tag }        from '@shared/models/tag.model';

import { TimeLog } from '@shared/models/time-log.model';


export class Task extends Base implements Searchable {
  private _name!: string;
  private _description!: string;

  private _lastTimeLog?: TimeLog;
  private _timeLogs: TimeLog[] = [];

  private _timeLogged = 0;

  private _tags: Tag[] = [];

  constructor(data: Partial<Task> = {}) {
    super();
    Object.assign(this, data);

    this.updateTimeLogged();
  }

  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
  }

  public get lastTimeLog(): TimeLog | undefined {
    return this._lastTimeLog;
  }

  public set lastTimeLog(value: TimeLog | undefined) {
    this._lastTimeLog = value;
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

  public get tags(): Tag[] {
    return this._tags;
  }

  public set tags(value: Tag[]) {
    this._tags = value;
  }

  public get lastTimeLogStartTime(): Date | null {
    const lastStartTime = this.lastTimeLog?.startTime.getTime();

    return lastStartTime && lastStartTime > -1 ? new Date(lastStartTime) : null;
  }

  public get isTimeLogRunning(): boolean {
    return !!this.lastTimeLog &&
      !(this.lastTimeLog.endTime instanceof Date);
  }


  public updateTimeLogged(): number {
    this.timeLogged = this.calcTimeLogged();

    return this.timeLogged;
  }

  public addTag(tag: Tag): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  public removeTag(tag: Tag): void {
    if (this.tags.includes(tag)) {
      this.tags = this.tags.filter(eTag => eTag !== tag);
    }
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

  public calcTimeLogged(timeLogs?: TimeLog[]): number {
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
