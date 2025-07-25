import { adaptTags } from '@shared/adapters/api-tag.adapter';
import { adaptJiraWorkLogs } from '@shared/adapters/jira-work-log.adapter';
import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Task } from '@shared/models/task.model';

export const adaptTask: (dbTask: ApiTask) => Task = (dbTask: ApiTask): Task =>
  new Task({
    id: dbTask.id,
    name: dbTask.name,
    lastTimeLog: dbTask.lastTimeLog && adaptTimeLog(dbTask.lastTimeLog),
    timeLogs: (dbTask.timeLogs && adaptTimeLogs(dbTask.timeLogs)) ?? [],
    jiraWorkLogs: (dbTask.jiraWorkLogs && adaptJiraWorkLogs(dbTask.jiraWorkLogs)) ?? [],
    description: dbTask.description,
    timeLogged: dbTask.timeLogged,
    tags: (dbTask.tags && adaptTags(dbTask.tags)) ?? [],
  });

export const adaptTasks: (dbTasks: ApiTask[]) => Task[] = (dbTasks: ApiTask[]): Task[] => dbTasks.map(
  (dbTask: ApiTask) => adaptTask(dbTask),
);
