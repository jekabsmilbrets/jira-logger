import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Tag }     from '@shared/models/tag.model';

import { validateTagsInterfaceData }     from '@task/data-validators/tag-interface-data.validator';
import { validateTimeLogsInterfaceData } from '@task/data-validators/time-log-interface.validator';


export const validateTaskInterfaceData = (taskInterfaceData: any, tags: Tag[]): ApiTask => {
  [
    '_name',
    '_timeLogs',
    '_tags',
  ]
    .forEach(
      (field: string) => {
        if (!taskInterfaceData.hasOwnProperty(field)) {
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

export const validateTasksInterfaceData = (tasksInterfaceData: any[], tags: Tag[]): ApiTask[] => tasksInterfaceData
  .map(
    (taskInterfaceData: any) => validateTaskInterfaceData(taskInterfaceData, tags),
  );
