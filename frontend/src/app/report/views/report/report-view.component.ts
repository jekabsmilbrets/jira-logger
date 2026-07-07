import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableRowAction } from '@shared/interfaces/table-row-action.interface';
import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import type { JiraWorkLogSyncOutcome } from '@tasks/interfaces/jira-work-log-sync-outcome.interface';
import { JiraWorkLogSyncService } from '@tasks/services/jira-work-log-sync.service';

import type { ReportViewState } from '@report/interfaces/report-view-state.interface';
import { ReportService } from '@report/services/report.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

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
  private readonly jiraWorkLogSyncService: JiraWorkLogSyncService = inject(JiraWorkLogSyncService);
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);

  protected readonly state: Signal<ReportViewState> = this.reportService.viewState;
  protected readonly rowActions: Signal<TableRowAction[]> = computed(() => this.buildRowActions());

  protected onCellClick(
    [row, column]: [Searchable, Column],
  ): void {
    const task: Task = row as Task;
    let outputValue: string;
    let message: string;

    switch (column.cellClickType) {
      case 'readableTime': {
        const timeLogged: number = Number(column.cell(task) ?? 0);
        const readableTimePipe: ReadableTimePipe = new ReadableTimePipe();

        outputValue = readableTimePipe.transform(timeLogged);
        message = `Copied Task "${ task.name }" logged time to clipboard "${ outputValue }"!`;
        break;
      }

      case 'string':
      case undefined:
      default:
        outputValue = String(column.cell(task) ?? '');
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
    const date: Date | null = this.state().reportDate;

    if (!(date instanceof Date)) {
      return;
    }

    this.jiraWorkLogSyncService.syncReportDate(task, date)
      .subscribe({
        next: (outcome: JiraWorkLogSyncOutcome) => {
          this.openSnackBar(outcome.message, outcome.duration);

          if (outcome.reloadReport) {
            this.reportService.reload();
          }
        },
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

  private buildRowActions(): TableRowAction[] {
    if (!this.state().canSyncJiraWorkLogs) {
      return [];
    }

    return [
      {
        id: 'sync',
        columnDef: 'sync',
        header: 'Sync',
        icon: 'sync',
        ariaLabel: 'Sync task to Jira',
        color: 'warn',
        tooltip: 'Task already synced with JIRA server!',
        isDisabled: (row: Searchable) => this.isTaskSynced(row as Task),
      },
    ];
  }

  private isTaskSynced(
    task: Task,
  ): boolean {
    const date: Date | null = this.state().reportDate;

    return date instanceof Date &&
      this.reportDateCalendarService.isTaskSyncedForReportDate(task, date);
  }

}
