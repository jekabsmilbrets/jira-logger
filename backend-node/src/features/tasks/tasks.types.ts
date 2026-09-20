import type { JiraWorkLogRow, TagRow, TimerRow } from '@database/records.types';

import type { TasksRepository } from '@features/tasks/tasks.repository';


export interface TaskFilter {
  tags: string[];
  name: string | undefined;
  range: [string | null, string | null] | undefined;
}

export interface TaskRelations {
  timers: TimerRow[];
  tags: TagRow[];
  logs: JiraWorkLogRow[];
}

export type TasksStore = Pick<TasksRepository, 'find' | 'exists' | 'names' | 'relations' | 'list' | 'save' | 'delete'>;
