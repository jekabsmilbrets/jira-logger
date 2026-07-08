import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableRowAction } from '@shared/interfaces/table-row-action.interface';
import { Task } from '@shared/models/task.model';

import type { ReportViewState } from '@report/interfaces/report-view-state.interface';
import { ReportService } from '@report/services/report.service';
import { ReportInteractionService } from '@report/services/report-interaction.service';

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
  private readonly reportInteractionService: ReportInteractionService = inject(ReportInteractionService);

  protected readonly state: Signal<ReportViewState> = this.reportService.viewState;
  protected readonly rowActions: Signal<TableRowAction[]> = computed(() => this.buildRowActions());

  protected onCellClick(
    [row, column]: [Searchable, Column],
  ): void {
    this.reportInteractionService.copyCell(row as Task, column);
  }

  protected onSyncClick(
    row: Searchable,
  ): void {
    const task: Task = row as Task;
    const date: Date | null = this.state().reportDate;

    if (!(date instanceof Date)) {
      return;
    }

    this.reportInteractionService.syncJiraWorkLog(task, date)
      .subscribe();
  }

  protected onFooterCellClicked(
    [rows, column]: [Searchable[], Column],
  ): void {
    this.reportInteractionService.copyFooter(rows as Task[], column);
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
      this.reportInteractionService.isJiraWorkLogSynced(task, date);
  }

}
