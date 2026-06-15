import { formatDate } from '@angular/common';
import { computed, inject, Service, Signal } from '@angular/core';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';

import { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { columns as monthModelColumns } from '@report/constants/report-date-range-columns.constant';
import { columns as totalModelColumns } from '@report/constants/report-total-columns.constant';
import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportStateService } from '@report/services/report-state.service';
import { ReportTaskQueryService } from '@report/services/report-task-query.service';

@Service()
export class ReportService {
  private readonly reportStateService: ReportStateService = inject(ReportStateService);
  private readonly reportTaskQueryService: ReportTaskQueryService = inject(ReportTaskQueryService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly localeService: LocaleService = inject(LocaleService);

  public readonly columns: Signal<Column[]> = computed(() => this.buildColumns());
  public readonly reportMode: Signal<ReportModeEnum> = this.reportStateService.reportMode;
  public readonly tags: Signal<Tag[]> = this.reportStateService.tags;
  public readonly date: Signal<Date | null> = this.reportStateService.date;
  public readonly startDate: Signal<Date | null> = this.reportStateService.startDate;
  public readonly endDate: Signal<Date | null> = this.reportStateService.endDate;
  public readonly showWeekends: Signal<boolean> = this.reportStateService.showWeekends;
  public readonly hideUnreportedTasks: Signal<boolean> = this.reportStateService.hideUnreportedTasks;
  public readonly tasks: Signal<Task[]> = this.reportTaskQueryService.tasks;

  public reload(): void {
    this.reportTaskQueryService.reload();
  }

  public setReportMode(
    mode: ReportModeEnum,
  ): void {
    this.reportStateService.setReportMode(mode);
  }

  public setTags(
    tags: Tag[],
  ): void {
    this.reportStateService.setTags(tags);
  }

  public setDate(
    date: Date | null,
  ): void {
    this.reportStateService.setDate(date);
  }

  public setStartDate(
    startDate: Date | null,
  ): void {
    this.reportStateService.setStartDate(startDate);
  }

  public setEndDate(
    endDate: Date | null,
  ): void {
    this.reportStateService.setEndDate(endDate);
  }

  public setShowWeekends(
    showWeekends: boolean,
  ): void {
    this.reportStateService.setShowWeekends(showWeekends);
  }

  public setHideUnreportedTasks(
    hideUnreportedTasks: boolean,
  ): void {
    this.reportStateService.setHideUnreportedTasks(hideUnreportedTasks);
  }

  private buildColumns(): Column[] {
    const reportMode: ReportModeEnum = this.reportStateService.getEffectiveReportMode(
      this.reportMode(),
      this.date(),
      this.startDate(),
      this.endDate(),
    );

    if (reportMode === ReportModeEnum.total) {
      return [...totalModelColumns];
    }

    if (reportMode === ReportModeEnum.date) {
      const date: Date | null = this.date();

      return date ?
        this.generateMonthColumns(
          date,
          date,
          this.showWeekends(),
          reportMode,
          this.reportTaskQueryService.jiraApiEnabled(),
        ) :
        [...totalModelColumns];
    }

    const startDate: Date | null = this.startDate();
    const endDate: Date | null = this.endDate();

    return startDate && endDate ?
      this.generateMonthColumns(
        startDate,
        endDate,
        this.showWeekends(),
        reportMode,
        this.reportTaskQueryService.jiraApiEnabled(),
      ) :
      [...totalModelColumns];
  }

  private generateMonthColumns(
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
    reportMode: ReportModeEnum,
    jiraApiEnabled: boolean,
  ): Column[] {
    const modifiedMonthModelColumns: Column[] = [...monthModelColumns];
    const currentDate: Date = new Date(startDate);
    const weekendIndexes: number[] = [0, 6];
    const reduceFn: (acc: number, value: number) => number = (
      acc: number,
      value: number,
    ) => acc + value;

    while (currentDate <= endDate) {
      const curDate: number = currentDate.getDate();
      const currentDate2: Date = new Date(currentDate.getTime());
      const shouldShowWeekends: boolean = showWeekends ?
        false :
        weekendIndexes.includes(currentDate2.getDay());

      modifiedMonthModelColumns.push({
        columnDef: 'date-' + currentDate.getTime(),
        header: formatDate(
          currentDate2,
          'd. MMM',
          this.localeService.locale,
          this.timezoneService.timezone,
        ),
        sortable: false,
        hidden: reportMode !== ReportModeEnum.date ? shouldShowWeekends : false,
        pipe: 'readableTime',
        isClickable: true,
        cellClickType: 'readableTime',
        footerCellClickType: 'readableTime',
        cell: (task: Task) => task.calcTimeLoggedForDate(currentDate2, this.timezoneService.timezone),
        hasFooter: true,
        footerCell: (tasks: Task[]) => tasks.map(
          (task: Task) => task.calcTimeLoggedForDate(currentDate2, this.timezoneService.timezone),
        )
          .reduce(reduceFn, 0),
      });

      currentDate.setDate(curDate + 1);
    }

    if (reportMode !== ReportModeEnum.date) {
      modifiedMonthModelColumns.push({
        columnDef: 'timeLogged',
        header: 'Total Time Logged',
        sortable: false,
        stickyEnd: true,
        hidden: false,
        isClickable: true,
        cellClickType: 'readableTime',
        footerCellClickType: 'readableTime',
        pipe: 'readableTime',
        cell: (task: Task) => task.calcTimeLogged(),
        hasFooter: true,
        footerCell: (tasks: Task[]) => tasks.map(
          (task: Task) => task.calcTimeLogged(),
        )
          .reduce(reduceFn, 0),
      });
    }

    if (reportMode === ReportModeEnum.date && jiraApiEnabled) {
      const taskSynced: (task: Task) => boolean = (
        task: Task,
      ) => task.calcTimeLogged() > 0 && task.calcTimeLogged() === task.calcTimeSynced(startDate, this.timezoneService.timezone);

      modifiedMonthModelColumns.push({
        columnDef: 'synced',
        header: 'Synced',
        sortable: false,
        stickyEnd: true,
        excludeFromLoop: false,
        hidden: false,
        taskSynced,
        pipe: 'readableTime',
        footerCellClickType: 'readableTime',
        cell: (task: Task) => task.calcTimeSynced(startDate, this.timezoneService.timezone),
        hasFooter: true,
        footerCell: (tasks: Task[]) => tasks.map(
          (task: Task) => task.calcTimeSynced(startDate, this.timezoneService.timezone),
        )
          .reduce(reduceFn, 0),
      });

      modifiedMonthModelColumns.push({
        columnDef: 'sync',
        header: 'Sync',
        excludeFromLoop: false,
        hidden: false,
        taskSynced,
        cell: (task: Task) => {
          void task;

          return undefined;
        },
      });
    }

    return modifiedMonthModelColumns;
  }

}
