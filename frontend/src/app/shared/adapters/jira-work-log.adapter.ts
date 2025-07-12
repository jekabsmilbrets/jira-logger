import { ApiJiraWorkLog } from '@shared/interfaces/api/jira-work-log.interface';
import { JiraWorkLog } from '@shared/models/jira-work-log.model';

export const adaptJiraWorkLog: (apiJiraWorkLog: ApiJiraWorkLog) => JiraWorkLog = (apiJiraWorkLog: ApiJiraWorkLog): JiraWorkLog =>
  new JiraWorkLog({
    id: apiJiraWorkLog.id,
    workLogId: apiJiraWorkLog.workLogId,
    description: apiJiraWorkLog.description,
    startTime: apiJiraWorkLog.startTime && new Date(apiJiraWorkLog.startTime),
    timeSpentSeconds: apiJiraWorkLog.timeSpentSeconds,
  });

export const adaptJiraWorkLogs: (apiJiraWorkLogs: ApiJiraWorkLog[]) => JiraWorkLog[] = (apiJiraWorkLogs: ApiJiraWorkLog[]): JiraWorkLog[] =>
  apiJiraWorkLogs.map(
    (apiJiraWorkLog: ApiJiraWorkLog) => adaptJiraWorkLog(apiJiraWorkLog),
  );
