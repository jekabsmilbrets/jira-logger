import { validateTimeLogsInterfaceData } from '@task/data-validators/time-log-interface.validator';
import { TaskInterface }                 from '@task/interfaces/task.interface';

export const validateTaskInterfaceData = (taskInterfaceData: any): TaskInterface => {
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
    _uuid: taskInterfaceData._uuid,
    _createDate: taskInterfaceData._createDate,
    _name: taskInterfaceData._name,
    _description: taskInterfaceData._description,
    _lastTimeLogId: taskInterfaceData._lastTimeLogId,
    _timeLogged: taskInterfaceData._timeLogged,
    _timeLogs: validateTimeLogsInterfaceData(taskInterfaceData._timeLogs),
    _tags: taskInterfaceData._tags,
  };
};

export const validateTasksInterfaceData = (tasksInterfaceData: any[]): TaskInterface[] => tasksInterfaceData
  .map(
    (taskInterfaceData: any) => validateTaskInterfaceData(taskInterfaceData),
  );
