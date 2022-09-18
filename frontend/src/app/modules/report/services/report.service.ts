import { formatDate } from '@angular/common';
import { Injectable } from '@angular/core';

import {
  BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, Observable, switchMap, take, tap, throwError,
  withLatestFrom,
} from 'rxjs';

import { appTimeZone, appLocale } from '@core/constants/date-time.constant';


import { StorageService } from '@core/services/storage.service';

import { Column }         from '@shared/interfaces/column.interface';
import { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';

import { Tag }          from '@shared/models/tag.model';
import { Task }         from '@shared/models/task.model';
import { TagsService }  from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { columns as monthModelColumns } from '@report/constants/report-date-range-columns.constant';
import { columns as totalModelColumns } from '@report/constants/report-total-columns.constant';
import { ReportModeEnum }               from '@report/enums/report-mode.enum';


@Injectable()
export class ReportService {
  public tasks$!: Observable<Task[]>;
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<Tag[]>;
  public date$: Observable<Date | null>;
  public startDate$: Observable<Date | null>;
  public endDate$: Observable<Date | null>;
  public showWeekends$: Observable<boolean>;
  public hideUnreportedTasks$: Observable<boolean>;

  public columns: Column[] = [];

  private reportModeSubject: BehaviorSubject<ReportModeEnum> = new BehaviorSubject<ReportModeEnum>(ReportModeEnum.total);
  private tagsSubject: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);
  private dateSubject: BehaviorSubject<Date | null> = new BehaviorSubject<Date | null>(null);
  private startDateSubject: BehaviorSubject<Date | null> = new BehaviorSubject<Date | null>(null);
  private endDateSubject: BehaviorSubject<Date | null> = new BehaviorSubject<Date | null>(null);
  private showWeekendsSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private hideUnreportedTasksSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private settingsKey: IDBValidKey = 'report';
  private customStoreName = 'settings';

  constructor(
    private storageService: StorageService,
    private tagsService: TagsService,
    private tasksService: TasksService,
  ) {
    this.reportMode$ = this.reportModeSubject.asObservable();
    this.tags$ = this.tagsSubject.asObservable();
    this.date$ = this.dateSubject.asObservable();
    this.startDate$ = this.startDateSubject.asObservable();
    this.endDate$ = this.endDateSubject.asObservable();
    this.showWeekends$ = this.showWeekendsSubject.asObservable();
    this.hideUnreportedTasks$ = this.hideUnreportedTasksSubject.asObservable();

    this.initSettings();

    this.listenToChanges().subscribe();

    this.tasks$ = this.getTasks();
  }

  public set date(date: Date | null) {
    this.dateSubject.next(date);
  }

  public set startDate(startDate: Date | null) {
    this.startDateSubject.next(startDate);
  }

  public set endDate(endDate: Date | null) {
    this.endDateSubject.next(endDate);
  }

  public set reportMode(mode: ReportModeEnum) {
    this.reportModeSubject.next(mode);
  }

  public set tags(tags: Tag[]) {
    this.tagsSubject.next(tags);
  }

  public set showWeekends(showWeekends: boolean) {
    this.showWeekendsSubject.next(showWeekends);
  }

  public set hideUnreportedTasks(hideUnreportedTasks: boolean) {
    this.hideUnreportedTasksSubject.next(hideUnreportedTasks);
  }

  private getAllChanges(): Observable<[Tag[], Date | null, Date | null, Date | null, ReportModeEnum, boolean, boolean]> {
    return combineLatest(
      [
        this.tags$,
        this.date$,
        this.startDate$,
        this.endDate$,
        this.reportMode$,
        this.showWeekends$,
        this.hideUnreportedTasks$,
      ],
    )
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
      );
  }

  private getTasks(): Observable<Task[]> {
    return this.getAllChanges()
               .pipe(
                 switchMap(
                   ([
                      tags,
                      date,
                      startDate,
                      endDate,
                      reportMode,
                      showWeekends,
                      hideUnreportedTasks,
                    ]: [Tag[], Date | null, Date | null, Date | null, ReportModeEnum, boolean, boolean]) => this.filterTasks(
                     reportMode, tags, date, startDate, endDate, showWeekends, hideUnreportedTasks,
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
      (
        !startDate ||
        !endDate
      )
    ) {
      reportMode = ReportModeEnum.total;
    }

    switch (reportMode) {
      case ReportModeEnum.total:
        delete filter.date;
        delete filter.endDate;
        delete filter.startDate;

        this.columns = totalModelColumns;
        break;

      case ReportModeEnum.date:
        delete filter.endDate;
        delete filter.startDate;

        this.columns = this.generateMonthColumns(
          date as Date,
          date as Date,
          showWeekends,
        );
        break;

      case ReportModeEnum.dateRange:
        delete filter.date;

        this.columns = this.generateMonthColumns(
          startDate as Date,
          endDate as Date,
          showWeekends,
        );
        break;
    }

    return this.tasksService.filteredList(filter);
  }

  private initSettings(): void {
    this.storageService.read(this.settingsKey, this.customStoreName)
        .pipe(
          take(1),
          withLatestFrom(this.tagsService.tags$),
          tap(([
                 settings,
                 tags,
               ]: [
                {
                  reportMode: ReportModeEnum;
                  tags: string[];
                  date: Date | null;
                  startDate: Date | null;
                  endDate: Date | null;
                  showWeekends: boolean;
                  hideUnreportedTasks: boolean;
                },
                Tag[],
              ]) => {
                this.reportModeSubject.next(settings?.reportMode ?? ReportModeEnum.total);
                this.tagsSubject.next(tags.filter((t: Tag) => settings?.tags.includes(t.id)) ?? []);
                this.dateSubject.next(settings?.date ?? null);
                this.startDateSubject.next(settings?.startDate ?? null);
                this.endDateSubject.next(settings?.endDate ?? null);
                this.showWeekendsSubject.next(settings?.showWeekends ?? false);
                this.hideUnreportedTasksSubject.next(settings?.hideUnreportedTasks ?? false);
              },
          ),
        )
        .subscribe();
  }

  private listenToChanges() {
    return this.getAllChanges()
               .pipe(
                 switchMap(
                   ([
                      tags,
                      date,
                      startDate,
                      endDate,
                      reportMode,
                      showWeekends,
                      hideUnreportedTasks,
                    ]: [Tag[], Date | null, Date | null, Date | null, ReportModeEnum, boolean, boolean]) =>
                     this.storageService.create(
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
                           catchError(
                             (error) => {
                               console.error(error);
                               return throwError(() => new Error(error));
                             },
                           ),
                         ),
                 ),
               );
  }

  private generateMonthColumns(
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
  ): Column[] {
    const modifiedMonthModelColumns = [...monthModelColumns];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const curDate = currentDate.getDate();
      const currentDate2 = new Date(currentDate.getTime());
      modifiedMonthModelColumns.push(
        {
          columnDef: 'date-' + currentDate.getTime(),
          header: formatDate(currentDate2, 'd. MMM', appLocale, appTimeZone),
          sortable: false,
          visible: showWeekends ? true :
                   !([
                     0,
                     6,
                   ].includes(currentDate2.getDay())),
          pipe: 'readableTime',
          isClickable: true,
          cell: (task: Task) => task.calcTimeLoggedForDate(currentDate2),
          hasFooter: true,
          footerCell: (tasks: Task[]) => tasks.map(
                                                (task: Task) => task.calcTimeLoggedForDate(currentDate2),
                                              )
                                              .reduce((acc, value) => acc + value, 0),
        },
      );

      currentDate.setDate(curDate + 1);
    }

    modifiedMonthModelColumns.push(
      {
        columnDef: 'timeLogged',
        header: 'Total Time Logged ' + formatDate(startDate, 'yyyy MMMM', appLocale, appTimeZone),
        sortable: false,
        stickyEnd: true,
        visible: true,
        isClickable: true,
        pipe: 'readableTime',
        cell: (task: Task) => task.calcTimeLoggedForDateRange(startDate, endDate),
        hasFooter: true,
        footerCell: (tasks: Task[]) => tasks.map(
                                              (task: Task) => task.timeLogs.map(t => t.timeLogged())
                                                                  .reduce((acc, value) => acc + value, 0),
                                            )
                                            .reduce((acc, value) => acc + value, 0),

      },
    );

    return modifiedMonthModelColumns;
  }
}
