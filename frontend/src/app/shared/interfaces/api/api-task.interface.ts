import type { ApiBase } from '@core/interfaces/api/base.interface';

import type { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import type { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';
import type { ApiJiraWorkLog } from '@shared/interfaces/api/jira-work-log.interface';

export interface ApiTask extends ApiBase {
  name: string;
  description?: string;

  lastTimeLog?: ApiTimeLog;

  timeLogs: ApiTimeLog[];
  jiraWorkLogs?: ApiJiraWorkLog[];
  timeLogged?: number;

  tags: ApiTag[];
}
