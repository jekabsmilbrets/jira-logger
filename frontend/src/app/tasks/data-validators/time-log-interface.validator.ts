import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';

export const validateTimeLogInterfaceData: (timeLogInterfaceData: any) => ApiTimeLog = (
  timeLogInterfaceData: any,
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

export const validateTimeLogsInterfaceData: (timeLogsInterfaceData: any[]) => ApiTimeLog[] = (
  timeLogsInterfaceData: any[],
): ApiTimeLog[] => timeLogsInterfaceData.map(
  (timeLogInterfaceData: any) => validateTimeLogInterfaceData(timeLogInterfaceData),
);
