import { formatDate } from '@angular/common';
import { computed, inject, Service, type Signal } from '@angular/core';
import type { ParamMap } from '@angular/router';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';

import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { reportDateRangeColumns } from '@report/constants/report-date-range-columns.constant';
import { reportTotalColumns } from '@report/constants/report-total-columns.constant';
import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import { ReportStateService } from '@report/services/report-state.service';
import { ReportTaskQueryService } from '@report/services/report-task-query.service';
import { buildReportTagTotalColumns } from '@report/utilities/build-report-tag-total-columns.utility';

@Service()
export class ReportService {
  private readonly reportStateService: ReportStateService = inject(ReportStateService);
  private readonly reportTaskQueryService: ReportTaskQueryService = inject(ReportTaskQueryService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly localeService: LocaleService = inject(LocaleService);

  public readonly columns: Signal<Column[]> = computed(() => this.buildColumns());
  public readonly reportMode: Signal<ReportMode> = this.reportStateService.reportMode;
  public readonly tags: Signal<Tag[]> = this.reportStateService.tags;
  public readonly date: Signal<Date | null> = this.reportStateService.date;
  public readonly startDate: Signal<Date | null> = this.reportStateService.startDate;
  public readonly endDate: Signal<Date | null> = this.reportStateService.endDate;
  public readonly showWeekends: Signal<boolean> = this.reportStateService.showWeekends;
  public readonly hideUnreportedTasks: Signal<boolean> = this.reportStateService.hideUnreportedTasks;
  public readonly tasks: Signal<Task[]> = this.reportTaskQueryService.tasks;
  public readonly state: Signal<ReportStateSnapshot> = computed(() => this.reportStateService.getStateSnapshot());

  public reload(): void {
    this.reportTaskQueryService.reload();
  }

  public updateState(
    patch: Partial<ReportStateSnapshot>,
  ): void {
    if (patch.reportMode !== undefined) {
      this.setReportMode(patch.reportMode);
    }

    if (patch.tags !== undefined) {
      this.setTags(patch.tags);
    }

    if (patch.date !== undefined) {
      this.setDate(patch.date);
    }

    if (patch.startDate !== undefined) {
      this.setStartDate(patch.startDate);
    }

    if (patch.endDate !== undefined) {
      this.setEndDate(patch.endDate);
    }

    if (patch.showWeekends !== undefined) {
      this.setShowWeekends(patch.showWeekends);
    }

    if (patch.hideUnreportedTasks !== undefined) {
      this.setHideUnreportedTasks(patch.hideUnreportedTasks);
    }
  }

  public applyRouteParams(
    paramMap: ParamMap,
  ): { shouldRedirect: boolean } {
    if (paramMap.has('reportMode')) {
      const reportMode: ReportMode = paramMap.get('reportMode') as ReportMode;
      this.updateState({
        reportMode: reportMode in ReportMode ? reportMode : ReportMode.total,
      });
    }

    if (paramMap.has('date')) {
      const date: Date = new Date(paramMap.get('date') as string);

      if (isFinite(+date)) {
        this.updateState({ date });

        return { shouldRedirect: true };
      }
    }

    return { shouldRedirect: false };
  }

  public setReportMode(
    mode: ReportMode,
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
    const reportMode: ReportMode = this.reportStateService.getEffectiveReportMode(
      this.reportMode(),
      this.date(),
      this.startDate(),
      this.endDate(),
    );
    const columnsByMode: Record<ReportMode, () => Column[]> = {
      [ReportMode.total]: () => this.buildTotalColumns(),
      [ReportMode.date]: () => this.buildDateColumns(reportMode),
      [ReportMode.dateRange]: () => this.buildRangeColumns(reportMode),
    };

    return columnsByMode[reportMode]();
  }

  private generateMonthColumns(
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
    reportMode: ReportMode,
    jiraApiEnabled: boolean,
  ): Column[] {
    const visibleDates: Date[] = this.buildVisibleDates(
      startDate,
      endDate,
      showWeekends,
      reportMode,
    );

    return [
      ...reportDateRangeColumns,
      ...this.buildDateColumnsForRange(startDate, endDate, showWeekends, reportMode),
      ...this.buildTagTotalColumns(
        (task: Task) => this.sumValues(
          visibleDates,
          (date: Date) => task.calcTimeLoggedForDate(
            date,
            this.timezoneService.timezone,
          ),
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
    const columns: Column[] = [];
    const currentDate: Date = new Date(startDate);

    while (currentDate <= endDate) {
      columns.push(this.buildDateColumn(new Date(currentDate.getTime()), showWeekends, reportMode));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return columns;
  }

  private buildVisibleDates(
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
    reportMode: ReportMode,
  ): Date[] {
    const dates: Date[] = [];
    const currentDate: Date = new Date(startDate);

    while (currentDate <= endDate) {
      const date: Date = new Date(currentDate.getTime());

      if (reportMode === ReportMode.date || !this.shouldHideWeekendColumn(
        date,
        showWeekends,
      )) {
        dates.push(date);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  private buildDateColumn(
    currentDate: Date,
    showWeekends: boolean,
    reportMode: ReportMode,
  ): Column {
    return {
      columnDef: 'date-' + currentDate.getTime(),
      header: formatDate(
        currentDate,
        'd. MMM',
        this.localeService.locale,
        this.timezoneService.timezone,
      ),
      sortable: false,
      hidden: reportMode !== ReportMode.date && this.shouldHideWeekendColumn(currentDate, showWeekends),
      pipe: 'readableTime',
      isClickable: true,
      cellClickType: 'readableTime',
      footerCellClickType: 'readableTime',
      cell: (task: Task) => task.calcTimeLoggedForDate(currentDate, this.timezoneService.timezone),
      hasFooter: true,
      footerCell: (tasks: Task[]) => this.sumValues(tasks, (task: Task) => task.calcTimeLoggedForDate(currentDate, this.timezoneService.timezone)),
    };
  }

  private shouldHideWeekendColumn(
    currentDate: Date,
    showWeekends: boolean,
  ): boolean {
    return !showWeekends && [0, 6].includes(currentDate.getDay());
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
    const taskSynced: (task: Task) => boolean = (task: Task) =>
      task.calcTimeLogged() > 0 && task.calcTimeLogged() === task.calcTimeSynced(startDate, this.timezoneService.timezone);

    return [
      {
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
        footerCell: (tasks: Task[]) => this.sumValues(tasks, (task: Task) => task.calcTimeSynced(startDate, this.timezoneService.timezone)),
      },
      {
        columnDef: 'sync',
        header: 'Sync',
        excludeFromLoop: false,
        hidden: false,
        taskSynced,
        cell: (task: Task) => {
          void task;

          return undefined;
        },
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
    getTaskVisibleTime: (task: Task) => number,
  ): Column[] {
    return buildReportTagTotalColumns(
      this.tags(),
      getTaskVisibleTime,
    );
  }

  private buildTotalColumns(): Column[] {
    const columns: Column[] = [...reportTotalColumns];
    const timeLoggedColumnIndex: number = columns.findIndex((column: Column) => column.columnDef === 'timeLogged');

    columns.splice(
      timeLoggedColumnIndex,
      0,
      ...this.buildTagTotalColumns((task: Task) => task.timeLogged),
    );

    return columns;
  }

  private buildDateColumns(
    reportMode: ReportMode,
  ): Column[] {
    const date: Date | null = this.date();

    return date ?
      this.generateMonthColumns(
        date,
        date,
        this.showWeekends(),
        reportMode,
        this.reportTaskQueryService.jiraApiEnabled(),
      ) :
      [...reportTotalColumns];
  }

  private buildRangeColumns(
    reportMode: ReportMode,
  ): Column[] {
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
