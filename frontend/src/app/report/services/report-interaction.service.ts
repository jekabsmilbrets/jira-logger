import { Clipboard } from '@angular/cdk/clipboard';
import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { map, type Observable, tap } from 'rxjs';

import type { Column } from '@shared/interfaces/column.interface';
import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import type { JiraWorkLogSyncOutcome } from '@tasks/interfaces/jira-work-log-sync-outcome.interface';
import { JiraWorkLogSyncService } from '@tasks/services/jira-work-log-sync.service';

import { ReportService } from '@report/services/report.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

@Service()
export class ReportInteractionService {
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly jiraWorkLogSyncService: JiraWorkLogSyncService = inject(JiraWorkLogSyncService);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly readableTimePipe: ReadableTimePipe = new ReadableTimePipe();
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);
  private readonly reportService: ReportService = inject(ReportService);

  public copyCell(
    task: Task,
    column: Column,
  ): void {
    const outputValue: string = this.cellOutputValue(task, column);
    const message: string = column.cellClickType === 'readableTime' ?
      `Copied Task "${ task.name }" logged time to clipboard "${ outputValue }"!` :
      `Copied Task "${ task.name }" field "${ column.header }" value to clipboard "${ outputValue }"!`;

    this.copyWithMessage(outputValue, message);
  }

  public copyFooter(
    tasks: Task[],
    column: Column,
  ): void {
    const outputValue: string = column.footerCellClickType === 'readableTime' ?
      this.readableTimePipe.transform(column.footerCell ? column.footerCell(tasks) as number : 0) :
      tasks.map((task: Task) => column.cell(task)).join(', ');
    const message: string = column.footerCellClickType === 'readableTime' ?
      `Copied logged time to clipboard "${ outputValue }"!` :
      `Copied field "${ column.header }" value to clipboard "${ outputValue }"!`;

    this.copyWithMessage(outputValue, message);
  }

  public syncJiraWorkLog(
    task: Task,
    date: Date,
  ): Observable<void> {
    return this.jiraWorkLogSyncService.syncReportDate(task, date)
      .pipe(
        tap((outcome: JiraWorkLogSyncOutcome) => {
          this.openSnackBar(outcome.message, outcome.duration);

          if (outcome.reloadReport) {
            this.reportService.reload();
          }
        }),
        map(() => undefined),
      );
  }

  public isJiraWorkLogSynced(
    task: Task,
    date: Date,
  ): boolean {
    return this.reportDateCalendarService.isTaskSyncedForReportDate(task, date);
  }

  private cellOutputValue(
    task: Task,
    column: Column,
  ): string {
    if (column.cellClickType === 'readableTime') {
      return this.readableTimePipe.transform(Number(column.cell(task) ?? 0));
    }

    return String(column.cell(task) ?? '');
  }

  private copyWithMessage(
    outputValue: string,
    message: string,
  ): void {
    this.clipboard.copy(outputValue);
    this.openSnackBar(message);
  }

  private openSnackBar(
    message: string,
    duration: number | null = 5000,
  ): void {
    this.matSnackBar.open(
      message,
      undefined,
      {
        duration: duration ?? undefined,
      },
    );
  }
}
