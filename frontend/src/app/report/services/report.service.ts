import { formatDate } from '@angular/common';
import { computed, effect, inject, Service, Signal, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { catchError, debounceTime, Observable, of, take, tap } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { LocaleService } from '@core/services/locale.service';
import { SettingsService } from '@core/services/settings.service';
import { StorageService } from '@core/services/storage.service';
import { TimezoneService } from '@core/services/timezone.service';

import { Column } from '@shared/interfaces/column.interface';
import { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { columns as monthModelColumns } from '@report/constants/report-date-range-columns.constant';
import { columns as totalModelColumns } from '@report/constants/report-total-columns.constant';
import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportSettingsStorageValue } from '@report/interfaces/report-settings-storage-value.interface';
import { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

@Service()
export class ReportService {
  public readonly columns: Signal<Column[]>;

  private readonly storageService: StorageService = inject(StorageService);
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly localeService: LocaleService = inject(LocaleService);

  private readonly reportModeSignal = signal<ReportModeEnum>(ReportModeEnum.total);
  private readonly tagsSignal = signal<Tag[]>([]);
  private readonly dateSignal = signal<Date | null>(null);
  private readonly startDateSignal = signal<Date | null>(null);
  private readonly endDateSignal = signal<Date | null>(null);
  private readonly showWeekendsSignal = signal<boolean>(false);
  private readonly hideUnreportedTasksSignal = signal<boolean>(false);
  private readonly reloadVersionSignal = signal<number>(0);
  private readonly jiraApiEnabled = computed(() => this.isJiraApiEnabled(this.settingsService.settings()));
  private readonly taskRequest = computed(() => ({
    state: this.getStateSnapshot(),
    jiraApiEnabled: this.jiraApiEnabled(),
    reloadVersion: this.reloadVersionSignal(),
  }));
  private readonly debouncedTaskRequest = toSignal(
    toObservable(this.taskRequest).pipe(debounceTime(250)),
    { initialValue: this.taskRequest() },
  );
  private readonly tasksResource = rxResource({
    params: this.debouncedTaskRequest,
    stream: ({ params }) => this.filterTasks(
      params.state.reportMode,
      params.state.tags,
      params.state.date,
      params.state.startDate,
      params.state.endDate,
      params.state.showWeekends,
      params.state.hideUnreportedTasks,
      params.jiraApiEnabled,
    )
      .pipe(
        catchError(() => of([])),
      ),
  });
  private readonly tasksState = computed(() => this.tasksResource.value() ?? []);
  public readonly reportMode: Signal<ReportModeEnum> = this.reportModeSignal.asReadonly();
  public readonly tags: Signal<Tag[]> = this.tagsSignal.asReadonly();
  public readonly date: Signal<Date | null> = this.dateSignal.asReadonly();
  public readonly startDate: Signal<Date | null> = this.startDateSignal.asReadonly();
  public readonly endDate: Signal<Date | null> = this.endDateSignal.asReadonly();
  public readonly showWeekends: Signal<boolean> = this.showWeekendsSignal.asReadonly();
  public readonly hideUnreportedTasks: Signal<boolean> = this.hideUnreportedTasksSignal.asReadonly();
  public readonly tasks: Signal<Task[]> = this.tasksState;

  private settingsKey: IDBValidKey = 'report';
  private customStoreName: string = 'settings';

  constructor() {
    this.columns = computed(() => this.buildColumns());

    this.initSettings();
    this.registerSettingsPersistence();
  }

  public reload(): void {
    this.reloadVersionSignal.update((value: number) => value + 1);
  }

  public setReportMode(
    mode: ReportModeEnum,
  ): void {
    this.reportModeSignal.set(mode);
  }

  public setTags(
    tags: Tag[],
  ): void {
    this.tagsSignal.set([...(tags ?? [])]);
  }

  public setDate(
    date: Date | null,
  ): void {
    this.dateSignal.set(this.normalizeStartOfDay(date));
  }

  public setStartDate(
    startDate: Date | null,
  ): void {
    this.startDateSignal.set(this.normalizeStartOfDay(startDate));
  }

  public setEndDate(
    endDate: Date | null,
  ): void {
    this.endDateSignal.set(this.normalizeEndOfDay(endDate));
  }

  public setShowWeekends(
    showWeekends: boolean,
  ): void {
    this.showWeekendsSignal.set(showWeekends);
  }

  public setHideUnreportedTasks(
    hideUnreportedTasks: boolean,
  ): void {
    this.hideUnreportedTasksSignal.set(hideUnreportedTasks);
  }

  private filterTasks(
    reportMode: ReportModeEnum,
    tags: Tag[],
    date: Date | null,
    startDate: Date | null,
    endDate: Date | null,
    showWeekends: boolean,
    hideUnreportedTasks: boolean,
    jiraApiEnabled: boolean,
  ): Observable<Task[]> {
    void showWeekends;
    void jiraApiEnabled;

    const filter: TaskListFilter = {
      tags: tags.map((t: Tag) => t.id),
      date,
      startDate,
      endDate,
      hideUnreported: hideUnreportedTasks,
    };

    if (tags.length === 0) {
      delete filter.tags;
    }

    reportMode = this.getEffectiveReportMode(
      reportMode,
      date,
      startDate,
      endDate,
    );

    if (reportMode === ReportModeEnum.total) {
      delete filter.date;
      delete filter.endDate;
      delete filter.startDate;
    }

    if (reportMode === ReportModeEnum.date) {
      delete filter.endDate;
      delete filter.startDate;
    }

    if (reportMode === ReportModeEnum.dateRange) {
      delete filter.date;
    }

    return this.tasksService.filteredList(
      filter,
      true,
    );
  }

  private registerSettingsPersistence(): void {
    effect((onCleanup) => {
      const state: ReportStateSnapshot = this.getStateSnapshot();
      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
        this.storageService.create(
          this.settingsKey,
          {
            reportMode: state.reportMode,
            tags: state.tags.map((tag: Tag) => tag.id),
            date: state.date,
            startDate: state.startDate,
            endDate: state.endDate,
            showWeekends: state.showWeekends,
            hideUnreportedTasks: state.hideUnreportedTasks,
          },
          this.customStoreName,
        )
          .pipe(
            take(1),
            catchError(() => of(undefined)),
          )
          .subscribe();
      }, 250);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  private initSettings(): void {
    this.storageService.read<ReportSettingsStorageValue | undefined>(
      this.settingsKey,
      this.customStoreName,
    )
      .pipe(
        take(1),
        take(1),
        tap((settings: ReportSettingsStorageValue | undefined) => {
          const availableTags: Tag[] | {
            filter?: (callback: (tag: Tag) => boolean) => Tag[] | undefined
          } = this.tagsService.tags() as Tag[];
          const selectedTagIds: string[] = settings?.tags ?? [];
          const selectedTags: Tag[] = availableTags && typeof availableTags === 'object' && 'filter' in availableTags ?
            availableTags.filter?.((tag: Tag) => selectedTagIds.includes(tag.id)) ?? [] :
            [];

          this.reportModeSignal.set(settings?.reportMode ?? ReportModeEnum.total);
          this.tagsSignal.set(selectedTags);
          this.dateSignal.set(this.cloneDate(settings?.date));
          this.startDateSignal.set(this.cloneDate(settings?.startDate));
          this.endDateSignal.set(this.cloneDate(settings?.endDate));
          this.showWeekendsSignal.set(settings?.showWeekends ?? false);
          this.hideUnreportedTasksSignal.set(settings?.hideUnreportedTasks ?? false);
        }),
      )
      .subscribe();
  }

  private buildColumns(): Column[] {
    const reportMode: ReportModeEnum = this.getEffectiveReportMode(
      this.reportModeSignal(),
      this.dateSignal(),
      this.startDateSignal(),
      this.endDateSignal(),
    );

    if (reportMode === ReportModeEnum.total) {
      return [...totalModelColumns];
    }

    if (reportMode === ReportModeEnum.date) {
      const date: Date | null = this.dateSignal();

      return date ?
        this.generateMonthColumns(
          date,
          date,
          this.showWeekendsSignal(),
          reportMode,
          this.jiraApiEnabled(),
        ) :
        [...totalModelColumns];
    }

    const startDate: Date | null = this.startDateSignal();
    const endDate: Date | null = this.endDateSignal();

    return startDate && endDate ?
      this.generateMonthColumns(
        startDate,
        endDate,
        this.showWeekendsSignal(),
        reportMode,
        this.jiraApiEnabled(),
      ) :
      [...totalModelColumns];
  }

  private getEffectiveReportMode(
    reportMode: ReportModeEnum,
    date: Date | null,
    startDate: Date | null,
    endDate: Date | null,
  ): ReportModeEnum {
    if (reportMode === ReportModeEnum.date && !date) {
      return ReportModeEnum.total;
    }

    if (reportMode === ReportModeEnum.dateRange && (!startDate || !endDate)) {
      return ReportModeEnum.total;
    }

    return reportMode;
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

  private cloneDate(
    date: Date | null | undefined,
  ): Date | null {
    return date ? new Date(date.getTime()) : null;
  }

  private normalizeStartOfDay(
    date: Date | null,
  ): Date | null {
    const nextDate: Date | null = this.cloneDate(date);
    nextDate?.setHours(0, 0, 0, 0);

    return nextDate;
  }

  private normalizeEndOfDay(
    date: Date | null,
  ): Date | null {
    const nextDate: Date | null = this.cloneDate(date);
    nextDate?.setHours(23, 59, 59, 999);

    return nextDate;
  }

  private isJiraApiEnabled(
    settings: Setting[],
  ): boolean {
    const jiraEnabledSetting: Setting | undefined = settings.find(
      (setting: Setting) => setting.name === JiraApiSettings.enabled,
    );

    if (!jiraEnabledSetting) {
      return false;
    }

    if (typeof jiraEnabledSetting.value === 'boolean') {
      return jiraEnabledSetting.value;
    }

    if (typeof jiraEnabledSetting.value === 'string') {
      return jiraEnabledSetting.value.toLowerCase() === 'true';
    }

    return false;
  }

  private getStateSnapshot(): ReportStateSnapshot {
    return {
      reportMode: this.reportModeSignal(),
      tags: [...this.tagsSignal()],
      date: this.cloneDate(this.dateSignal()),
      startDate: this.cloneDate(this.startDateSignal()),
      endDate: this.cloneDate(this.endDateSignal()),
      showWeekends: this.showWeekendsSignal(),
      hideUnreportedTasks: this.hideUnreportedTasksSignal(),
    };
  }
}
