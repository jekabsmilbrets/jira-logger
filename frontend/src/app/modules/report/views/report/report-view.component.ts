import { Clipboard }         from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { MatSnackBar }       from '@angular/material/snack-bar';

import { catchError, filter, map, Observable, of, switchMap, take } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Column }           from '@shared/interfaces/column.interface';
import { Searchable }       from '@shared/interfaces/searchable.interface';
import { Task }             from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { TasksService }     from '@shared/services/tasks.service';
import { TimeLogsService }  from '@shared/services/time-logs.service';
import { SharedModule }     from '@shared/shared.module';

import { ReportMenuComponent } from '@report/components/report-menu/report-menu.component';
import { ReportModeEnum }      from '@report/enums/report-mode.enum';
import { ReportService }       from '@report/services/report.service';


@Component(
  {
    selector: 'report-view',
    templateUrl: './report-view.component.html',
    styleUrls: ['./report-view.component.scss'],
  },
)
export class ReportViewComponent implements OnInit {
  public tasks$!: Observable<Task[]>;

  constructor(
    private dynamicMenuService: DynamicMenuService,
    private reportService: ReportService,
    private tasksService: TasksService,
    private timeLogsService: TimeLogsService,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
  ) {
    this.tasks$ = this.reportService.tasks$;
  }

  public get columns(): Column[] {
    return this.reportService.columns;
  }

  public get reportMode$(): Observable<ReportModeEnum> {
    return this.reportService.reportMode$;
  }

  public ngOnInit(): void {
    this.createDynamicMenu();
  }

  public onCellClick([row, column]: [Searchable, Column]): void {
    const task = row as Task;
    let outputValue;
    let message;

    switch (column.cellClickType) {
      case 'readableTime':
        const timeLogged: number = column.cell(task);
        const readableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied Task "${ task.name }" logged time to clipboard "${ outputValue }"!`;
        break;

      case 'string':
      case undefined:
      default:
        outputValue = column.cell(task);
        message = `Copied Task "${ task.name }" field "${ column.header }" value to clipboard "${ outputValue }"!`;
        break;
    }

    this.clipboard.copy(outputValue);
    this.openSnackBar(message);
  }

  public onSyncClick(row: Searchable): void {
    const task = row as Task;
    this.reportService.date$
      .pipe(
        filter((date: Date | null) => date instanceof Date),
        take(1),
        map((date: Date | null): Date => date as Date),
        switchMap(
          (date: Date) => {
            const syncDateToJiraApi$ = this.tasksService.syncDateToJiraApi(task, date);

            if (task.isTimeLogRunning) {
              return this.timeLogsService.stop(task)
                .pipe(
                  catchError(() => of(null)),
                  switchMap(() => syncDateToJiraApi$),
                  switchMap(() => this.timeLogsService.start(task)),
                );
            }

            return syncDateToJiraApi$;
          },
        ),
        take(1),
      )
      .subscribe(
        {
          next: () => {
            this.openSnackBar(`Task "${ task.name }" synced successfully!`);
            this.reportService.reload();
          },
          error: (error: HttpErrorResponse) => this.openSnackBar(
            `Task "${ task.name }" failed synced! ${ error?.error?.errors?.join(', ') }`,
          ),
        },
      );
  }

  public onFooterCellClicked([rows, column]: [Searchable[], Column]): void {
    const tasks = rows as Task[];
    let outputValue;
    let message;

    switch (column.footerCellClickType) {
      case 'readableTime':
        const timeLogged: number = column.footerCell(tasks);
        const readableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied logged time to clipboard "${ outputValue }"!`;
        break;

      case 'concatenatedString':
      case undefined:
      default:
        outputValue = tasks.map((task: Task) => column.cell(task)).join(', ');
        message = `Copied field "${ column.header }" value to clipboard "${ outputValue }"!`;
        break;
    }

    this.clipboard.copy(outputValue);
    this.openSnackBar(message);
  }

  private openSnackBar(
    message: string,
    duration: number = 5000,
  ): void {
    this.snackBar.open(
      message,
      undefined,
      {
        duration,
      },
    );
  }

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
}
