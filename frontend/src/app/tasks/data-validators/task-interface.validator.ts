import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Tag } from '@shared/models/tag.model';

import { validateTagsInterfaceData } from '@tasks/data-validators/tag-interface-data.validator';
import { validateTimeLogsInterfaceData } from '@tasks/data-validators/time-log-interface.validator';
import { TaskInterfaceData, TasksInterfaceData } from '@tasks/interfaces/imported-task-data.interface';

export const validateTaskInterfaceData: (taskInterfaceData: TaskInterfaceData, tags: Tag[]) => ApiTask = (
  taskInterfaceData: TaskInterfaceData,
  tags: Tag[],
): ApiTask => {
  ['_name', '_timeLogs', '_tags'].forEach(
    (field: string) => {
      if (!Object.prototype.hasOwnProperty.call(taskInterfaceData, field)) {
        throw new Error(`Missing Required field "${ field }" for Task!`);
      }
    },
  );

  return {
    name: taskInterfaceData._name,
    description: taskInterfaceData._description,
    timeLogs: taskInterfaceData._timeLogs && validateTimeLogsInterfaceData(taskInterfaceData._timeLogs),
    tags: taskInterfaceData._tags && validateTagsInterfaceData(taskInterfaceData._tags, tags),
  } as ApiTask;
};

export const validateTasksInterfaceData: (tasksInterfaceData: TasksInterfaceData, tags: Tag[]) => ApiTask[] = (
  tasksInterfaceData: TasksInterfaceData,
  tags: Tag[],
): ApiTask[] =>
  tasksInterfaceData.map(
    (taskInterfaceData: TaskInterfaceData) => validateTaskInterfaceData(
      taskInterfaceData,
      tags,
    ),
  );
