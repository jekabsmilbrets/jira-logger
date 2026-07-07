import { formatDate } from '@angular/common';
import { inject, Service } from '@angular/core';

import type { TimezoneDateParts } from '@core/interfaces/timezone-date-parts.interface';
import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';
import { fromWallClockDateInTimezone, getDateTimePartsInTimezone, toWallClockDateInTimezone } from '@core/utilities/timezone-date.utility';

import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Task } from '@shared/models/task.model';

@Service()
export class ReportDateCalendarService {
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);

  public todayRouteLink(): string {
    return `/report/date/${ this.formatQueryDate(new Date()) }`;
  }

  public todayReportDate(): Date {
    return this.startOfReportDate(new Date());
  }

  public parseRouteDate(
    value: string | null,
  ): Date | null {
    if (!value) {
      return null;
    }

    const match: RegExpMatchArray | null = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return null;
    }

    const year: number = Number(match[1]);
    const month: number = Number(match[2]);
    const day: number = Number(match[3]);
    const wallClockDate: Date = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (
      wallClockDate.getFullYear() !== year ||
      wallClockDate.getMonth() !== month - 1 ||
      wallClockDate.getDate() !== day
    ) {
      return null;
    }

    return fromWallClockDateInTimezone(wallClockDate, this.timezoneService.timezone);
  }

  public formatQueryDate(
    date: Date,
  ): string {
    const parts: TimezoneDateParts = getDateTimePartsInTimezone(date, this.timezoneService.timezone);

    return [
      String(parts.year),
      String(parts.month).padStart(2, '0'),
      String(parts.day).padStart(2, '0'),
    ].join('-');
  }

  public formatJiraSyncDate(
    date: Date,
  ): string {
    return this.formatQueryDate(date);
  }

  public datesInRange(
    startDate: Date,
    endDate: Date,
  ): Date[] {
    const dates: Date[] = [];
    const startParts: TimezoneDateParts = getDateTimePartsInTimezone(startDate, this.timezoneService.timezone);
    const endTime: number = this.startOfReportDate(endDate).getTime();
    const currentDate: Date = new Date(startParts.year, startParts.month - 1, startParts.day, 0, 0, 0, 0);

    while (fromWallClockDateInTimezone(currentDate, this.timezoneService.timezone).getTime() <= endTime) {
      dates.push(fromWallClockDateInTimezone(currentDate, this.timezoneService.timezone));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  public isWeekend(
    date: Date,
  ): boolean {
    return [0, 6].includes(toWallClockDateInTimezone(date, this.timezoneService.timezone).getDay());
  }

  public visibleDatesInRange(
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
  ): Date[] {
    return this.datesInRange(startDate, endDate)
      .filter((date: Date) => showWeekends || !this.isWeekend(date));
  }

  public formatColumnHeader(
    date: Date,
  ): string {
    return formatDate(
      date,
      'd. MMM',
      this.localeService.locale,
      this.timezoneService.timezone,
    );
  }

  public startOfReportDate(
    date: Date,
  ): Date {
    const parts: TimezoneDateParts = getDateTimePartsInTimezone(date, this.timezoneService.timezone);

    return fromWallClockDateInTimezone(
      new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0),
      this.timezoneService.timezone,
    );
  }

  public endOfReportDate(
    date: Date,
  ): Date {
    const parts: TimezoneDateParts = getDateTimePartsInTimezone(date, this.timezoneService.timezone);
    const startOfNextReportDate: Date = fromWallClockDateInTimezone(
      new Date(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0, 0),
      this.timezoneService.timezone,
    );

    return new Date(startOfNextReportDate.getTime() - 1);
  }

  public timeLoggedForReportDate(
    task: Task,
    date: Date,
  ): number {
    return task.calcTimeLoggedForDate(this.startOfReportDate(date), this.timezoneService.timezone);
  }

  public timeSyncedForReportDate(
    task: Task,
    date: Date,
  ): number {
    const reportDate: string = this.formatQueryDate(date);
    const jiraWorkLog: JiraWorkLog | undefined = task.jiraWorkLogs.find(
      (workLog: JiraWorkLog) => this.formatQueryDate(workLog.startTime) === reportDate,
    );

    return jiraWorkLog?.timeSpentSeconds ?? 0;
  }

  public isTaskSyncedForReportDate(
    task: Task,
    date: Date,
  ): boolean {
    const timeLogged: number = this.timeLoggedForReportDate(task, date);

    return timeLogged > 0 &&
      timeLogged === this.timeSyncedForReportDate(task, date);
  }
}
