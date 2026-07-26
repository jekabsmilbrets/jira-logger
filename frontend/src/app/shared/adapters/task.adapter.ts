import { adaptTags } from '@shared/adapters/api-tag.adapter';
import { adaptJiraWorkLogs } from '@shared/adapters/jira-work-log.adapter';
import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Task } from '@shared/models/task.model';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';

export const adaptTask: (dbTask: ApiTask) => Task = (dbTask: ApiTask): Task =>
  new Task({
    id: dbTask.id,
    name: dbTask.name,
    ...adaptTaskRelations(dbTask),
    description: dbTask.description,
    timeLogged: dbTask.timeLogged,
  });

export const adaptTasks: (dbTasks: ApiTask[]) => Task[] = (dbTasks: ApiTask[]): Task[] => dbTasks.map(
  (dbTask: ApiTask) => adaptTask(dbTask),
);

export const adaptTaskRequest: (task: Task) => ApiRequestBody = (task: Task): ApiRequestBody => ({
  id: task.id,
  name: task.name && task.name.trim(),
  description: task.description && task.description.trim(),
  tags: task.tags.map((tag) => tag.id),
});

const adaptTaskRelations: (dbTask: ApiTask) => Pick<Task, 'lastTimeLog' | 'timeLogs' | 'jiraWorkLogs' | 'tags'> = (
  dbTask: ApiTask,
) => ({
  lastTimeLog: dbTask.lastTimeLog ? adaptTimeLog(dbTask.lastTimeLog) : undefined,
  timeLogs: dbTask.timeLogs ? adaptTimeLogs(dbTask.timeLogs) : [],
  jiraWorkLogs: dbTask.jiraWorkLogs ? adaptJiraWorkLogs(dbTask.jiraWorkLogs) : [],
  tags: dbTask.tags ? adaptTags(dbTask.tags) : [],
});
