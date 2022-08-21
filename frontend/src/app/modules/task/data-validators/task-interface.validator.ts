import { ApiTask } from '@shared/interfaces/api/api-task.interface';

import { validateTimeLogsInterfaceData } from '@task/data-validators/time-log-interface.validator';


export const validateTaskInterfaceData = (taskInterfaceData: any): ApiTask => {
  [
    '_uuid',
    '_createDate',
    '_name',
    '_tags',
  ]
    .forEach(
      (field: string) => {
        if (!taskInterfaceData.hasOwnProperty(field)) {
          throw new Error(`Missing Required field "${field}" for Task!`);
        }
      },
    );

  return {
    id: taskInterfaceData._uuid,
    createdAt: taskInterfaceData._createDate,
    name: taskInterfaceData._name,
    description: taskInterfaceData._description,
    timeLogged: taskInterfaceData._timeLogged,
    timeLogs: validateTimeLogsInterfaceData(taskInterfaceData._timeLogs),
    tags: taskInterfaceData._tags,
  };
};

export const validateTasksInterfaceData = (tasksInterfaceData: any[]): ApiTask[] => tasksInterfaceData
  .map(
    (taskInterfaceData: any) => validateTaskInterfaceData(taskInterfaceData),
  );
