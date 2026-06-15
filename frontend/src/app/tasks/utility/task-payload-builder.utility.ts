import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TaskFormPayload } from '@tasks/interfaces/task-form-payload.interface';
import { TimeLogFormData } from '@tasks/interfaces/time-log-form-data.interface';

export const buildTaskUpdatePayload: (sourceTask: Task, formData: TaskFormPayload) => Task = (
  sourceTask: Task,
  formData: TaskFormPayload,
): Task => new Task({
  ...sourceTask,
  name: typeof formData.name === 'string' ? formData.name : sourceTask.name,
  description: typeof formData.description === 'string' ? formData.description : sourceTask.description,
  tags: Array.isArray(formData.tags) ? [...formData.tags] : sourceTask.tags,
  timeLogs: [...sourceTask.timeLogs],
  jiraWorkLogs: [...sourceTask.jiraWorkLogs],
});

export const buildTimeLogPayload: (sourceTimeLog: TimeLog, formData: TimeLogFormData) => TimeLog = (
  sourceTimeLog: TimeLog,
  formData: TimeLogFormData,
): TimeLog => new TimeLog({
  ...sourceTimeLog,
  startTime: formData.startTime ?? sourceTimeLog.startTime,
  endTime: formData.endTime ?? undefined,
  description: formData.description ?? undefined,
});
