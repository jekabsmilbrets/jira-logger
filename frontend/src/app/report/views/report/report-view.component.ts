import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { catchError, type Observable, of, switchMap } from 'rxjs';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

@Component({
  selector: 'report-view',
  templateUrl: './report-view.component.html',
  styleUrls: ['./report-view.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TableComponent,
  ],
})
export class ReportViewComponent {
  private readonly reportService: ReportService = inject(ReportService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);

  protected readonly tasks: Signal<Task[]> = this.reportService.tasks;
  protected readonly reportMode: Signal<ReportMode> = this.reportService.reportMode;

  protected readonly ReportMode: typeof ReportMode = ReportMode;

  protected get columns(): Signal<Column[]> {
    return this.reportService.columns;
  }

  protected onCellClick(
    [row, column]: [Searchable, Column],
  ): void {
    const task: Task = row as Task;
    let outputValue: string;
    let message: string;

    switch (column.cellClickType) {
      case 'readableTime': {
        const timeLogged: number = column.cell(task);
        const readableTimePipe: ReadableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied Task "${ task.name }" logged time to clipboard "${ outputValue }"!`;
        break;
      }

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

  protected onSyncClick(
    row: Searchable,
  ): void {
    const task: Task = row as Task;
    const date: Date | null = this.reportService.date();

    if (!(date instanceof Date)) {
      return;
    }

    const syncDateToJiraApi$: Observable<boolean> = this.tasksService.syncDateToJiraApi(
      task,
      date,
    );

    const syncRequest$: Observable<unknown> = task.isTimeLogRunning ?
      this.timeLogsService.stop(task)
        .pipe(
          catchError(() => of(null)),
          switchMap(() => syncDateToJiraApi$),
          switchMap(() => this.timeLogsService.start(task)),
        ) :
      syncDateToJiraApi$;

    syncRequest$.subscribe({
      next: () => {
        this.openSnackBar(`Task "${ task.name }" synced successfully!`);
        this.reportService.reload();
      },
      error: (error: HttpErrorResponse) => this.openSnackBar(
        `Task "${ task.name }" failed synced! ${ error?.error?.errors?.join(', ') }`,
      ),
    });
  }

  protected onFooterCellClicked(
    [rows, column]: [Searchable[], Column],
  ): void {
    const tasks: Task[] = rows as Task[];
    let outputValue: string;
    let message: string;

    switch (column.footerCellClickType) {
      case 'readableTime': {
        const timeLogged: number = column.footerCell ? column.footerCell(tasks) as number : 0;
        const readableTimePipe: ReadableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied logged time to clipboard "${ outputValue }"!`;
        break;
      }

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
    this.matSnackBar.open(
      message,
      undefined,
      {
        duration,
      },
    );
  }

}
