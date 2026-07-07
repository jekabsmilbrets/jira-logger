import type { Column } from '@shared/interfaces/column.interface';
import type { Task } from '@shared/models/task.model';

export interface ReportViewState {
  tasks: Task[];
  columns: Column[];
  reportDate: Date | null;
  canSyncJiraWorkLogs: boolean;
}
