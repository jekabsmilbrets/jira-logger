import { formatDate } from '@angular/common';
import { computed, inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { catchError, combineLatest, debounceTime, map, Observable, of, Subscription, switchMap, take, tap, withLatestFrom } from 'rxjs';

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

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  public readonly tasks$: Observable<Task[]>;
  public readonly reportMode$: Observable<ReportModeEnum>;
  public readonly tags$: Observable<Tag[]>;
  public readonly date$: Observable<Date | null>;
  public readonly startDate$: Observable<Date | null>;
  public readonly endDate$: Observable<Date | null>;
  public readonly showWeekends$: Observable<boolean>;
  public readonly hideUnreportedTasks$: Observable<boolean>;
  public readonly reload$: Observable<void>;
  public readonly columns: Signal<Column[]>;

  private readonly storageService: StorageService = inject(StorageService);
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly injector: Injector = inject(Injector);

  private readonly reportModeSignal = signal<ReportModeEnum>(ReportModeEnum.total);
  private readonly tagsSignal = signal<Tag[]>([]);
  private readonly dateSignal = signal<Date | null>(null);
  private readonly startDateSignal = signal<Date | null>(null);
  private readonly endDateSignal = signal<Date | null>(null);
  private readonly showWeekendsSignal = signal<boolean>(false);
  private readonly hideUnreportedTasksSignal = signal<boolean>(false);
  private readonly reloadVersionSignal = signal<number>(0);
  private readonly jiraApiEnabledSignal = signal<boolean>(false);

  private settingsKey: IDBValidKey = 'report';
  private customStoreName: string = 'settings';

  public get reportMode(): Signal<ReportModeEnum> {
    return this.reportModeSignal.asReadonly();
  }

  public set reportMode(
    mode: ReportModeEnum,
  ) {
    this.reportModeSignal.set(mode);
  }

  public get tags(): Signal<Tag[]> {
    return this.tagsSignal.asReadonly();
  }

  public set tags(
    tags: Tag[],
  ) {
    this.tagsSignal.set([...(tags ?? [])]);
  }

  public get date(): Signal<Date | null> {
    return this.dateSignal.asReadonly();
  }

  public set date(
    date: Date | null,
  ) {
    this.dateSignal.set(this.normalizeStartOfDay(date));
  }

  public get startDate(): Signal<Date | null> {
    return this.startDateSignal.asReadonly();
  }

  public set startDate(
    startDate: Date | null,
  ) {
    this.startDateSignal.set(this.normalizeStartOfDay(startDate));
  }

  public get endDate(): Signal<Date | null> {
    return this.endDateSignal.asReadonly();
  }

  public set endDate(
    endDate: Date | null,
  ) {
    this.endDateSignal.set(this.normalizeEndOfDay(endDate));
  }

  public get showWeekends(): Signal<boolean> {
    return this.showWeekendsSignal.asReadonly();
  }

  public set showWeekends(
    showWeekends: boolean,
  ) {
    this.showWeekendsSignal.set(showWeekends);
  }

  public get hideUnreportedTasks(): Signal<boolean> {
    return this.hideUnreportedTasksSignal.asReadonly();
  }

  public set hideUnreportedTasks(
    hideUnreportedTasks: boolean,
  ) {
    this.hideUnreportedTasksSignal.set(hideUnreportedTasks);
  }

  constructor() {
    this.reportMode$ = this.asStateObservable(this.reportModeSignal.asReadonly());
    this.tags$ = this.asStateObservable(this.tagsSignal.asReadonly());
    this.date$ = this.asStateObservable(this.dateSignal.asReadonly());
    this.startDate$ = this.asStateObservable(this.startDateSignal.asReadonly());
    this.endDate$ = this.asStateObservable(this.endDateSignal.asReadonly());
    this.showWeekends$ = this.asStateObservable(this.showWeekendsSignal.asReadonly());
    this.hideUnreportedTasks$ = this.asStateObservable(this.hideUnreportedTasksSignal.asReadonly());
    this.reload$ = this.asStateObservable(this.reloadVersionSignal.asReadonly())
      .pipe(map(() => undefined));
    this.columns = computed(() => this.buildColumns());

    this.initSettings();

    this.listenToChanges()
      .subscribe();

    this.listenToSettings()
      .subscribe();

    this.tasks$ = this.getTasks();
  }

  public reload(): void {
    this.reloadVersionSignal.update((value: number) => value + 1);
  }

  private getAllChanges(): Observable<[Tag[], Date | null, Date | null, Date | null, ReportModeEnum, boolean, boolean, void, boolean]> {
    return combineLatest([
      this.tags$,
      this.date$,
      this.startDate$,
      this.endDate$,
      this.reportMode$,
      this.showWeekends$,
      this.hideUnreportedTasks$,
      this.reload$,
      this.asStateObservable(this.jiraApiEnabledSignal.asReadonly()),
    ])
      .pipe(
        debounceTime(250),
      );
  }

  private getTasks(): Observable<Task[]> {
    return this.getAllChanges()
      .pipe(
        switchMap(
          ([tags, date, startDate, endDate, reportMode, showWeekends, hideUnreportedTasks, , jiraApiEnabled]: [
            Tag[],
              Date | null,
              Date | null,
              Date | null,
            ReportModeEnum,
            boolean,
            boolean,
            void,
            boolean,
          ]) => this.filterTasks(
            reportMode,
            tags,
            date,
            startDate,
            endDate,
            showWeekends,
            hideUnreportedTasks,
            jiraApiEnabled,
          ),
        ),
      );
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

  private initSettings(): void {
    this.storageService.read<ReportSettingsStorageValue | undefined>(
      this.settingsKey,
      this.customStoreName,
    )
      .pipe(
        take(1),
        withLatestFrom(this.tagsService.tags$),
        take(1),
        tap(
          ([settings, tags]: [ReportSettingsStorageValue | undefined, Tag[]]) => {
            this.reportModeSignal.set(settings?.reportMode ?? ReportModeEnum.total);
            this.tagsSignal.set(tags.filter((t: Tag) => settings?.tags.includes(t.id)) ?? []);
            this.dateSignal.set(this.cloneDate(settings?.date));
            this.startDateSignal.set(this.cloneDate(settings?.startDate));
            this.endDateSignal.set(this.cloneDate(settings?.endDate));
            this.showWeekendsSignal.set(settings?.showWeekends ?? false);
            this.hideUnreportedTasksSignal.set(settings?.hideUnreportedTasks ?? false);
          },
        ),
      )
      .subscribe();
  }

  private listenToChanges(): Observable<void | (null | false | true | void | Tag[] | Date | ReportModeEnum | number)[]> {
    return this.getAllChanges()
      .pipe(
        switchMap(
          ([tags, date, startDate, endDate, reportMode, showWeekends, hideUnreportedTasks, reload, jiraApiEnabled]: [
            Tag[],
              Date | null,
              Date | null,
              Date | null,
            ReportModeEnum,
            boolean,
            boolean,
            void,
            boolean,
          ]) => this.storageService.create(
            this.settingsKey,
            {
              reportMode,
              tags: tags.map((t: Tag) => t.id),
              date,
              startDate,
              endDate,
              showWeekends,
              hideUnreportedTasks,
            },
            this.customStoreName,
          )
            .pipe(
              take(1),
              catchError(() => {
                return of([
                  tags,
                  date,
                  startDate,
                  endDate,
                  reportMode,
                  showWeekends,
                  hideUnreportedTasks,
                  reload,
                  jiraApiEnabled,
                ]);
              }),
            ),
        ),
      );
  }

  private listenToSettings(): Observable<boolean> {
    return this.settingsService.settings$
      .pipe(
        map((settings: Setting[]) => this.isJiraApiEnabled(settings)),
        tap((jiraApiEnabled: boolean) => this.jiraApiEnabledSignal.set(jiraApiEnabled)),
      );
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
          this.jiraApiEnabledSignal(),
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
        this.jiraApiEnabledSignal(),
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

  private asStateObservable<T>(
    source: Signal<T>,
  ): Observable<T> {
    return new Observable<T>((subscriber) => {
      let currentValue: T = source();

      subscriber.next(currentValue);

      const subscription: Subscription = toObservable(source, { injector: this.injector })
        .subscribe({
          next: (value: T) => {
            if (Object.is(value, currentValue)) {
              return;
            }

            currentValue = value;
            subscriber.next(value);
          },
          error: (error: unknown) => subscriber.error(error),
          complete: () => subscriber.complete(),
        });

      return () => subscription.unsubscribe();
    });
  }
}
