import { formatDate }                   from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params }       from '@angular/router';

import { Observable, Subscription, take } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Column }           from '@shared/interfaces/column.interface';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import { SharedModule } from '@shared/shared.module';

import { ReportModeSwitcherComponent }  from '@task/components/report-mode-switcher/report-mode-switcher.component';
import { columns as monthModelColumns } from '@task/constants/report-month-columns.constant';
import { columns as totalModelColumns } from '@task/constants/report-total-columns.constant';
import { ReportModeEnum }               from '@task/enums/report-mode.enum';
import { Task }                         from '@task/models/task.model';
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
    this.tasks$ = this.tasksService.tasks$;

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
    this.subscriptions.push(
      this.reportService.reportMode$
          .subscribe(
            (reportMode: ReportModeEnum) => this.switchReportMode(reportMode),
          ),
    );
  }

  public ngOnInit(): void {
    this.createDynamicMenu();

    this.tasksService.list()
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  private createDynamicMenu(): void {
    this.dynamicMenuService.addDynamicMenu(
      new DynamicMenu(
        ReportModeSwitcherComponent,
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

  private switchReportMode(reportMode: ReportModeEnum): void {
    switch (true) {
      case reportMode === ReportModeEnum.total:
        break;
      case reportMode === ReportModeEnum.month:
        this.tableColumns[reportMode] = this.generateMonthColumns();
        break;
    }

    this.columns = this.tableColumns[reportMode];
  }

  private generateMonthColumns(): Column[] {
    const modifiedMonthModelColumns = [...monthModelColumns];
    const dateA = new Date('2022-03-01');
    const dateB = new Date('2022-03-31');
    const currentDate = new Date(dateA);

    while (currentDate < dateB) {
      const curDate = currentDate.getDate();
      const currentDate2 = new Date(currentDate.getTime());
      modifiedMonthModelColumns.push(
        {
          columnDef: 'date-' + curDate,
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
        header: 'Total Time Logged ' + formatDate(dateA, 'yyyy MMMM', 'lv-LV'),
        sortable: true,
        visible: true,
        stickyEnd: true,
        cell: (task: Task) => (new ReadableTimePipe())
          .transform(
            task.calcTimeLoggedForDateRange(dateA, dateB),
            true,
          ),
      },
    );

    return modifiedMonthModelColumns;
  }
}
