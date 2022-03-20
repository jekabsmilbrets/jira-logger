import { formatDate }                   from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params }       from '@angular/router';

import { Observable, Subscription, take, combineLatest, map, delay } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Column }           from '@shared/interfaces/column.interface';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import { SharedModule } from '@shared/shared.module';

import { ReportMenuComponent }          from '@task/components/report-menu/report-menu.component';
import { columns as monthModelColumns } from '@task/constants/report-month-columns.constant';
import { columns as totalModelColumns } from '@task/constants/report-total-columns.constant';
import { ReportModeEnum }               from '@task/enums/report-mode.enum';
import { TaskTagsEnum }                 from '@task/enums/task-tags.enum';
import { Task }                         from '@task/models/task.model';
import { TimeLog }                      from '@task/models/time-log.model';
import { ReportService }                from '@task/services/report.service';
import { TasksService }                 from '@task/services/tasks.service';

@Component({
             selector: 'app-report-view',
             templateUrl: './report-view.component.html',
             styleUrls: ['./report-view.component.scss'],
           })
export class ReportViewComponent implements OnInit, OnDestroy {
  public tasks$!: Observable<Task[]>;
  public columns: Column[] = [];

  private tableColumns: { [key: string]: Column[] } = {
    total: totalModelColumns,
    month: [],
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private tasksService: TasksService,
    private dynamicMenuService: DynamicMenuService,
    private reportService: ReportService,
    private activatedRoute: ActivatedRoute,
  ) {
    this.subscriptions.push(
      this.activatedRoute.params
          .pipe()
          .subscribe(
            (params: Params) => {
              const reportMode = params['reportMode'];
              if (reportMode) {
                this.reportService.reportMode = ReportModeEnum[reportMode as keyof typeof ReportModeEnum];
              }
            },
          ),
    );
  }

  public ngOnInit(): void {
    this.createDynamicMenu();

    this.tasks$ = combineLatest(
      [
        this.tasksService.tasks$,
        this.reportService.tags$,
        this.reportService.startDate$,
        this.reportService.endDate$,
        this.reportService.reportMode$,
        this.reportService.showWeekends$,
      ],
    )
      .pipe(
        delay(100), // hax :D :D
        map(
          ([
             tasks,
             tags,
             startDate,
             endDate,
             reportMode,
             showWeekends,
           ]: [Task[], TaskTagsEnum[], Date, Date, ReportModeEnum, boolean]) => this.filterTasks(
            reportMode, tasks, tags, startDate, endDate, showWeekends,
          ),
        ),
      );

    this.tasksService.list()
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  private filterTasks(
    reportMode: ReportModeEnum,
    tasks: Task[],
    tags: TaskTagsEnum[],
    startDate: Date,
    endDate: Date,
    showWeekends: boolean,
  ): Task[] {
    tasks = [...tasks];

    tasks = tasks
      .filter(
        (task: Task) => this.filterTaskByTags(task, tags),
      );

    switch (reportMode) {
      case ReportModeEnum.total:

        break;
      case ReportModeEnum.dateRange:
        tasks = tasks
          .filter(
            (task: Task) => this.filterTaskByDateRange(task, startDate, endDate),
          );

        this.tableColumns[reportMode] = this.generateMonthColumns(startDate, endDate, showWeekends);
        break;
    }

    this.columns = this.tableColumns[reportMode];

    return tasks;
  }

  private filterTaskByTags(task: Task, sTags: TaskTagsEnum[]): boolean {
    return sTags.length > 0 ?
           sTags.some(
             (sTag: TaskTagsEnum) => task.tags.includes(sTag),
           ) :
           true;

  };

  private filterTaskByDateRange(task: Task, sDate: Date, eDate: Date): boolean {
    const startDateTime = sDate.getTime();
    const endDateTime = eDate.getTime();

    return task.timeLogs.some(
      (tl: TimeLog) => {
        if (!tl?.startTime || !tl?.endTime) {
          return false;
        }

        const startTime = tl.startTime?.getTime();
        const endTime = tl.endTime?.getTime();

        return (startTime >= startDateTime && endTime <= endDateTime) ||
          (startTime >= startDateTime && endTime >= endDateTime) ||
          (startTime <= startDateTime && endTime <= endDateTime) ||
          (startTime <= startDateTime && endTime >= endDateTime);
      },
    );
  };

  private createDynamicMenu(): void {
    this.dynamicMenuService.addDynamicMenu(
      new DynamicMenu(
        ReportMenuComponent,
        {
          route: '/tasks/report',
          providers: [
            {
              provide: ReportService,
              useValue: this.reportService,
            },
            SharedModule,
          ],
        },
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
          header: formatDate(currentDate2, 'd. MMM', 'lv-LV'),
          sortable: true,
          visible: !([
            0,
            6,
          ].includes(currentDate2.getDay())),
          cell: (task: Task) => (new ReadableTimePipe())
            .transform(
              task.calcTimeLoggedForDate(currentDate2),
              true,
            ),
        },
      );

      currentDate.setDate(curDate + 1);
    }

    modifiedMonthModelColumns.push(
      {
        columnDef: 'timeLogged',
        header: 'Total Time Logged ' + formatDate(startDate, 'yyyy MMMM', 'lv-LV'),
        sortable: true,
        visible: true,
        stickyEnd: true,
        cell: (task: Task) => (new ReadableTimePipe())
          .transform(
            task.calcTimeLoggedForDateRange(startDate, endDate),
            true,
          ),
      },
    );

    return modifiedMonthModelColumns;
  }
}
