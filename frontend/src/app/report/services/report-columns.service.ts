import { inject, Service } from '@angular/core';

import type { Column } from '@shared/interfaces/column.interface';
import { Task } from '@shared/models/task.model';

import { reportDateRangeColumns } from '@report/constants/report-date-range-columns.constant';
import { reportTotalColumns } from '@report/constants/report-total-columns.constant';
import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';
import { buildReportTagTotalColumns } from '@report/utilities/build-report-tag-total-columns.utility';

@Service()
export class ReportColumnsService {
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);

  public buildColumns(
    state: ReportStateSnapshot,
    reportMode: ReportMode,
    jiraApiEnabled: boolean,
  ): Column[] {
    switch (reportMode) {
      case ReportMode.date:
        return this.buildDateColumns(state, reportMode, jiraApiEnabled);
      case ReportMode.dateRange:
        return this.buildRangeColumns(state, reportMode, jiraApiEnabled);
      case ReportMode.total:
      default:
        return this.buildTotalColumns(state);
    }
  }

  private generateMonthColumns(
    state: ReportStateSnapshot,
    startDate: Date,
    endDate: Date,
    reportMode: ReportMode,
    jiraApiEnabled: boolean,
  ): Column[] {
    const visibleDates: Date[] = reportMode === ReportMode.date ?
      this.reportDateCalendarService.datesInRange(startDate, endDate) :
      this.reportDateCalendarService.visibleDatesInRange(
        startDate,
        endDate,
        state.showWeekends,
      );

    return [
      ...reportDateRangeColumns,
      ...this.buildDateColumnsForRange(startDate, endDate, state.showWeekends, reportMode),
      ...this.buildTagTotalColumns(
        state,
        (task: Task) => this.sumValues(
          visibleDates,
          (date: Date) => this.reportDateCalendarService.timeLoggedForReportDate(task, date),
        ),
      ),
      ...this.buildTrailingColumns(startDate, reportMode, jiraApiEnabled),
    ];
  }

  private buildDateColumnsForRange(
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
    reportMode: ReportMode,
  ): Column[] {
    return this.reportDateCalendarService.datesInRange(startDate, endDate)
      .map((date: Date) => this.buildDateColumn(date, showWeekends, reportMode));
  }

  private buildDateColumn(
    currentDate: Date,
    showWeekends: boolean,
    reportMode: ReportMode,
  ): Column {
    return {
      columnDef: 'date-' + currentDate.getTime(),
      header: this.reportDateCalendarService.formatColumnHeader(currentDate),
      sortable: false,
      hidden: reportMode !== ReportMode.date && !showWeekends && this.reportDateCalendarService.isWeekend(currentDate),
      pipe: 'readableTime',
      isClickable: true,
      cellClickType: 'readableTime',
      footerCellClickType: 'readableTime',
      cell: (task: Task) => this.reportDateCalendarService.timeLoggedForReportDate(task, currentDate),
      hasFooter: true,
      footerCell: (tasks: Task[]) => this.sumValues(tasks, (task: Task) => this.reportDateCalendarService.timeLoggedForReportDate(task, currentDate)),
    };
  }

  private buildTrailingColumns(
    startDate: Date,
    reportMode: ReportMode,
    jiraApiEnabled: boolean,
  ): Column[] {
    if (reportMode === ReportMode.date) {
      return jiraApiEnabled ?
        this.buildDateSyncColumns(startDate) :
        [];
    }

    return [this.buildTimeLoggedColumn()];
  }

  private buildDateSyncColumns(
    startDate: Date,
  ): Column[] {
    return [
      {
        columnDef: 'synced',
        header: 'Synced',
        sortable: false,
        stickyEnd: true,
        excludeFromLoop: false,
        hidden: false,
        pipe: 'readableTime',
        footerCellClickType: 'readableTime',
        cell: (task: Task) => this.reportDateCalendarService.timeSyncedForReportDate(task, startDate),
        hasFooter: true,
        footerCell: (tasks: Task[]) => this.sumValues(tasks, (task: Task) => this.reportDateCalendarService.timeSyncedForReportDate(task, startDate)),
      },
    ];
  }

  private buildTimeLoggedColumn(): Column {
    return {
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
      footerCell: (tasks: Task[]) => this.sumValues(tasks, (task: Task) => task.calcTimeLogged()),
    };
  }

  private buildTagTotalColumns(
    state: ReportStateSnapshot,
    getTaskVisibleTime: (task: Task) => number,
  ): Column[] {
    return buildReportTagTotalColumns(
      state.tags,
      getTaskVisibleTime,
    );
  }

  private buildTotalColumns(
    state: ReportStateSnapshot,
  ): Column[] {
    const columns: Column[] = [...reportTotalColumns];
    const timeLoggedColumnIndex: number = columns.findIndex((column: Column) => column.columnDef === 'timeLogged');

    columns.splice(
      timeLoggedColumnIndex,
      0,
      ...this.buildTagTotalColumns(state, (task: Task) => task.timeLogged),
    );

    return columns;
  }

  private buildDateColumns(
    state: ReportStateSnapshot,
    reportMode: ReportMode,
    jiraApiEnabled: boolean,
  ): Column[] {
    return state.date ?
      this.generateMonthColumns(
        state,
        state.date,
        state.date,
        reportMode,
        jiraApiEnabled,
      ) :
      [...reportTotalColumns];
  }

  private buildRangeColumns(
    state: ReportStateSnapshot,
    reportMode: ReportMode,
    jiraApiEnabled: boolean,
  ): Column[] {
    return state.startDate && state.endDate ?
      this.generateMonthColumns(
        state,
        state.startDate,
        state.endDate,
        reportMode,
        jiraApiEnabled,
      ) :
      [...reportTotalColumns];
  }

  private sumValues<T>(
    values: T[],
    getValue: (value: T) => number,
  ): number {
    return values
      .map(getValue)
      .reduce((acc: number, value: number) => acc + value, 0);
  }
}
