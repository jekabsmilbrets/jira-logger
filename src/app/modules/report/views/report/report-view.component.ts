import { formatDate }                   from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params }       from '@angular/router';

import { Observable, Subscription, take, combineLatest, map, delay } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Column }       from '@shared/interfaces/column.interface';
import { SharedModule } from '@shared/shared.module';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';
import { Task }         from '@task/models/task.model';
import { TimeLog }      from '@task/models/time-log.model';
import { TasksService } from '@task/services/tasks.service';

import { ReportMenuComponent }          from '@report/components/report-menu/report-menu.component';
import { columns as monthModelColumns } from '@report/constants/report-date-range-columns.constant';
import { columns as totalModelColumns } from '@report/constants/report-total-columns.constant';
import { ReportModeEnum }               from '@report/enums/report-mode.enum';
import { ReportService }                from '@report/services/report.service';

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

              if (reportMode && reportMode in ReportModeEnum) {
                this.reportService.reportMode = ReportModeEnum[reportMode as keyof typeof ReportModeEnum];
              } else {
                this.reportService.reportMode = ReportModeEnum.total;
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
          route: '/report',
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
          sortable: false,
          visible: showWeekends ? true :
                   !([
                     0,
                     6,
                   ].includes(currentDate2.getDay())),
          pipe: 'readableTime',
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
        header: 'Total Time Logged ' + formatDate(startDate, 'yyyy MMMM', 'lv-LV'),
        sortable: false,
        stickyEnd: true,
        visible: true,
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
