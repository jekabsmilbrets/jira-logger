import type { JiraWorkLogsRepository } from '../../jira-work-logs.repository.js';

export interface RemoteWorkLogWrite {
  id: string;
  taskId: string;
  remoteId: string;
  seconds: number;
  date: string | null;
}

export type JiraWorkLogsStore = Pick<JiraWorkLogsRepository, 'list' | 'find' | 'forDate' | 'update' | 'saveRemote' | 'delete'>;
