import { formatDate } from '@angular/common';
import { inject, Injectable, Signal, signal } from '@angular/core';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';

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
  public tasks$!: Observable<Task[]>;
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<Tag[]>;
  public date$: Observable<Date | null>;
  public startDate$: Observable<Date | null>;
  public endDate$: Observable<Date | null>;
  public showWeekends$: Observable<boolean>;
  public hideUnreportedTasks$: Observable<boolean>;
  public reload$: Observable<void>;

  public readonly columns: Signal<Column[]>;

  private readonly storageService: StorageService = inject(StorageService);
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly localeService: LocaleService = inject(LocaleService);

  private reportModeSubject: BehaviorSubject<ReportModeEnum> = new BehaviorSubject<ReportModeEnum>(ReportModeEnum.total);
  private tagsSubject: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);
  private dateSubject: BehaviorSubject<Date | null> = new BehaviorSubject<Date | null>(null);
  private startDateSubject: BehaviorSubject<Date | null> = new BehaviorSubject<Date | null>(null);
  private endDateSubject: BehaviorSubject<Date | null> = new BehaviorSubject<Date | null>(null);
  private showWeekendsSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private hideUnreportedTasksSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private reloadSubject: BehaviorSubject<void> = new BehaviorSubject<void>(undefined);
  private jiraApiEnabledSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly columnsSignal = signal<Column[]>([]);

  private settingsKey: IDBValidKey = 'report';
  private customStoreName: string = 'settings';

  constructor() {
    this.reportMode$ = this.reportModeSubject.asObservable();
    this.tags$ = this.tagsSubject.asObservable();
    this.date$ = this.dateSubject.asObservable();
    this.startDate$ = this.startDateSubject.asObservable();
    this.endDate$ = this.endDateSubject.asObservable();
    this.showWeekends$ = this.showWeekendsSubject.asObservable();
    this.hideUnreportedTasks$ = this.hideUnreportedTasksSubject.asObservable();
    this.reload$ = this.reloadSubject.asObservable();
    this.columns = this.columnsSignal.asReadonly();

    this.initSettings();

    this.listenToChanges()
      .subscribe();

    this.listenToSettings()
      .subscribe();

    this.tasks$ = this.getTasks();
  }

  public set date(
    date: Date | null,
  ) {
    this.dateSubject.next(this.normalizeStartOfDay(date));
  }

  public set startDate(
    startDate: Date | null,
  ) {
    this.startDateSubject.next(this.normalizeStartOfDay(startDate));
  }

  public set endDate(
    endDate: Date | null,
  ) {
    this.endDateSubject.next(this.normalizeEndOfDay(endDate));
  }

  public set reportMode(
    mode: ReportModeEnum,
  ) {
    this.reportModeSubject.next(mode);
  }

  public set tags(
    tags: Tag[],
  ) {
    this.tagsSubject.next([...(tags ?? [])]);
  }

  public set showWeekends(
    showWeekends: boolean,
  ) {
    this.showWeekendsSubject.next(showWeekends);
  }

  public set hideUnreportedTasks(
    hideUnreportedTasks: boolean,
  ) {
    this.hideUnreportedTasksSubject.next(hideUnreportedTasks);
  }

  public reload(): void {
    this.reloadSubject.next();
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
      this.jiraApiEnabledSubject.asObservable(),
    ])
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
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

    if (
      reportMode === ReportModeEnum.date &&
      !date
    ) {
      reportMode = ReportModeEnum.total;
    }

    if (
      reportMode === ReportModeEnum.dateRange &&
      (!startDate || !endDate)
    ) {
      reportMode = ReportModeEnum.total;
    }

    switch (reportMode) {
      case ReportModeEnum.total:
        delete filter.date;
        delete filter.endDate;
        delete filter.startDate;

        this.columnsSignal.set([...totalModelColumns]);
        break;

      case ReportModeEnum.date:
        delete filter.endDate;
        delete filter.startDate;

        this.columnsSignal.set(this.generateMonthColumns(
          date as Date,
          date as Date,
          showWeekends,
          reportMode,
          jiraApiEnabled,
        ));
        break;

      case ReportModeEnum.dateRange:
        delete filter.date;

        this.columnsSignal.set(this.generateMonthColumns(
          startDate as Date,
          endDate as Date,
          showWeekends,
          reportMode,
          jiraApiEnabled,
        ));
        break;
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
            this.reportModeSubject.next(settings?.reportMode ?? ReportModeEnum.total);
            this.tagsSubject.next(tags.filter((t: Tag) => settings?.tags.includes(t.id)) ?? []);
            this.dateSubject.next(this.cloneDate(settings?.date));
            this.startDateSubject.next(this.cloneDate(settings?.startDate));
            this.endDateSubject.next(this.cloneDate(settings?.endDate));
            this.showWeekendsSubject.next(settings?.showWeekends ?? false);
            this.hideUnreportedTasksSubject.next(settings?.hideUnreportedTasks ?? false);
          },
        ),
      )
      .subscribe();
  }

  private listenToChanges(): Observable<void | (null | false | true | void | Tag[] | Date | ReportModeEnum)[]> {
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
        tap((jiraApiEnabled: boolean) => this.jiraApiEnabledSubject.next(jiraApiEnabled)),
      );
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
}
