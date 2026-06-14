import { Base } from '@core/models/base.model';
import { getDateParts } from '@core/utils/get-date-parts.utility';
import {
  fromWallClockDateInTimezone,
  getDateTimePartsInTimezone,
  isSameCalendarDateInTimezone,
  TimezoneDateParts,
} from '@core/utils/timezone-date.utility';

import { Searchable } from '@shared/interfaces/searchable.interface';
import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Tag } from '@shared/models/tag.model';
import { TimeLog } from '@shared/models/time-log.model';

export class Task extends Base implements Searchable {
  private _name!: string;
  private _description!: string;

  private _lastTimeLog?: TimeLog;
  private _timeLogs: TimeLog[] = [];
  private _jiraWorkLogs: JiraWorkLog[] = [];

  private _timeLogged = 0;

  private _tags: Tag[] = [];

  constructor(data: Partial<Task> = {}) {
    super();
    Object.assign(
      this,
      data,
    );

    this.updateTimeLogged();
  }

  public get jiraWorkLogs(): JiraWorkLog[] {
    return [...this._jiraWorkLogs];
  }

  public set jiraWorkLogs(value: JiraWorkLog[]) {
    this._jiraWorkLogs = [...(value ?? [])];
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
    return [...this._timeLogs];
  }

  public set timeLogs(value: TimeLog[]) {
    this._timeLogs = [...(value ?? [])];
    this.updateTimeLogged();
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
    return [...this._tags];
  }

  public set tags(value: Tag[]) {
    this._tags = [...(value ?? [])];
  }

  public get lastTimeLogStartTime(): Date | null {
    const lastStartTime: undefined | number = this.lastTimeLog?.startTime.getTime();

    return lastStartTime && lastStartTime > -1 ?
      new Date(lastStartTime) :
      null;
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
      this.tags = [
        ...this.tags,
        tag,
      ];
    }
  }

  public removeTag(tag: Tag): void {
    if (this.tags.includes(tag)) {
      this.tags = this.tags.filter(
        (eTag: Tag) => eTag !== tag,
      );
    }
  }

  public calcTimeLoggedForDate(date: Date, timezone?: string): number {
    const [rangeStart, rangeEnd] = this.getDayRange(date, timezone);

    return (this.timeLogs ?? []).reduce(
      (totalSeconds: number, timeLog: TimeLog) => totalSeconds + this.getTimeLogOverlapSeconds(timeLog, rangeStart, rangeEnd),
      0,
    );
  }

  public calcTimeLogged(timeLogs?: TimeLog[]): number {
    timeLogs = timeLogs ??
      this.timeLogs ??
      [];

    if (timeLogs.length === 0) {
      return 0;
    }

    const mapFn: (timeLog: TimeLog) => [number, number] = (timeLog: TimeLog) => [
      (timeLog.endTime ?? new Date()).getTime(),
      timeLog.startTime.getTime(),
    ];

    const reduceFn: (prev: number, times: number[]) => number = (prev: number, times: number[]) => {
      const [endTime, startTime]: number[] = [...times];

      return !endTime || !startTime ?
        prev :
        Math.ceil(prev + (endTime - startTime) / 1000);
    };

    return timeLogs.map(mapFn)
      .reduce(
        reduceFn,
        0,
      ) ?? 0;
  }

  public calcTimeSynced(startDate: Date, timezone?: string): number {
    const date: Date = new Date(startDate.getTime());
    date.setHours(0, 0, 0, 0);

    const jiraWorkLog: JiraWorkLog | undefined = this._jiraWorkLogs.find(
      (_jiraWorkLog: JiraWorkLog) => timezone ?
        isSameCalendarDateInTimezone(_jiraWorkLog.startTime, date, timezone) :
        _jiraWorkLog.startTime.getTime() === date.getTime(),
    );

    if (!jiraWorkLog) {
      return 0;
    }

    return jiraWorkLog.timeSpentSeconds;
  }

  private getDayRange(date: Date, timezone?: string): [Date, Date] {
    if (timezone) {
      const parts: TimezoneDateParts = getDateTimePartsInTimezone(date, timezone);
      const dayStartWallClock: Date = new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
      const nextDayStartWallClock: Date = new Date(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0, 0);

      return [
        fromWallClockDateInTimezone(dayStartWallClock, timezone),
        fromWallClockDateInTimezone(nextDayStartWallClock, timezone),
      ];
    }

    const [year, month, day] = getDateParts(date);
    const dayStart: Date = new Date(year, month, day, 0, 0, 0, 0);
    const nextDayStart: Date = new Date(year, month, day + 1, 0, 0, 0, 0);

    return [dayStart, nextDayStart];
  }

  private getTimeLogOverlapSeconds(timeLog: TimeLog, rangeStart: Date, rangeEnd: Date): number {
    const timeLogStart: Date = timeLog.startTime;
    const timeLogEnd: Date = timeLog.endTime ?? new Date();
    const overlapStart: number = Math.max(timeLogStart.getTime(), rangeStart.getTime());
    const overlapEnd: number = Math.min(timeLogEnd.getTime(), rangeEnd.getTime());

    if (overlapEnd <= overlapStart) {
      return 0;
    }

    return Math.ceil((overlapEnd - overlapStart) / 1000);
  }
}
