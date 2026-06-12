import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';

import { TimeLogInterfaceData, TimeLogsInterfaceData } from '@tasks/interfaces/imported-task-data.interface';

export const validateTimeLogInterfaceData: (timeLogInterfaceData: TimeLogInterfaceData) => ApiTimeLog = (
  timeLogInterfaceData: TimeLogInterfaceData,
): ApiTimeLog => {
  ['_startTime'].forEach(
    (field: string) => {
      if (!Object.prototype.hasOwnProperty.call(timeLogInterfaceData, field)) {
        throw new Error(`Missing Required field "${ field }" for Time Log!`);
      }
    },
  );

  return {
    startTime: timeLogInterfaceData._startTime,
    endTime: timeLogInterfaceData._endTime,
    description: timeLogInterfaceData._description,
  } as ApiTimeLog;
};

export const validateTimeLogsInterfaceData: (timeLogsInterfaceData: TimeLogsInterfaceData) => ApiTimeLog[] = (
  timeLogsInterfaceData: TimeLogsInterfaceData,
): ApiTimeLog[] => timeLogsInterfaceData.map(
  (timeLogInterfaceData: TimeLogInterfaceData) => validateTimeLogInterfaceData(timeLogInterfaceData),
);
