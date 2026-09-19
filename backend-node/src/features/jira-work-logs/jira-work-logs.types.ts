import type { JiraWorkLogsRepository } from '@features/jira-work-logs/jira-work-logs.repository';


export interface RemoteWorkLogWrite {
  id: string;
  taskId: string;
  remoteId: string;
  seconds: number;
  date: string | null;
}

export type JiraWorkLogsStore = Pick<JiraWorkLogsRepository, 'list' | 'find' | 'forDate' | 'update' | 'saveRemote' | 'delete'>;
