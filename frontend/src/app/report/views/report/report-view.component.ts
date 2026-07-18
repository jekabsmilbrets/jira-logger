import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { map, type Observable, tap } from 'rxjs';

import { TableComponent, type TableConfiguration } from '@shared/components/table/table.component';
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
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly jiraWorkLogSyncService: JiraWorkLogSyncService = inject(JiraWorkLogSyncService);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly readableTimePipe: ReadableTimePipe = new ReadableTimePipe();
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);
  private readonly reportService: ReportService = inject(ReportService);

  protected readonly state: Signal<ReportViewState> = this.reportService.viewState;
  protected readonly rowActions: Signal<TableRowAction[]> = computed(() => this.buildRowActions());
  protected readonly tableConfiguration: Signal<TableConfiguration> = computed(() => ({
    columns: this.state().columns,
    data: this.state().tasks,
    footer: true,
    selectable: false,
    rowActions: this.rowActions(),
    sort: {
      direction: 'desc',
      field: 'lastTimeLogStartTime',
    },
  }));

  protected onCellClick(
    [row, column]: [Searchable, Column],
  ): void {
    const task: Task = row as Task;
    const outputValue: string = this.cellOutputValue(task, column);
    const message: string = column.cellClickType === 'readableTime' ?
      `Copied Task "${ task.name }" logged time to clipboard "${ outputValue }"!` :
      `Copied Task "${ task.name }" field "${ column.header }" value to clipboard "${ outputValue }"!`;

    this.copyWithMessage(outputValue, message);
  }

  protected onSyncClick(
    row: Searchable,
  ): void {
    const date: Date | null = this.state().reportDate;

    if (!(date instanceof Date)) {
      return;
    }

    this.syncJiraWorkLog(row as Task, date)
      .subscribe();
  }

  protected onFooterCellClicked(
    [rows, column]: [Searchable[], Column],
  ): void {
    const tasks: Task[] = rows as Task[];
    const outputValue: string = column.footerCellClickType === 'readableTime' ?
      this.readableTimePipe.transform(column.footerCell ? column.footerCell(tasks) as number : 0) :
      tasks.map((task: Task) => column.cell(task)).join(', ');
    const message: string = column.footerCellClickType === 'readableTime' ?
      `Copied logged time to clipboard "${ outputValue }"!` :
      `Copied field "${ column.header }" value to clipboard "${ outputValue }"!`;

    this.copyWithMessage(outputValue, message);
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
      this.reportDateCalendarService.accountTask(task, date).isSynced;
  }

  private syncJiraWorkLog(
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
