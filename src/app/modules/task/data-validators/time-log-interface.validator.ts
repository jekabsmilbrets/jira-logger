import { TimeLogInterface } from '@task/interfaces/time-log.interface';

export const validateTimeLogInterfaceData = (timeLogInterfaceData: any): TimeLogInterface => {
  [
    '_uuid',
    '_startTime',
  ]
    .forEach(
      (field: string) => {
        if (!timeLogInterfaceData.hasOwnProperty(field)) {
          throw new Error(`Missing Required field "${field}" for Time Log!`);
        }
      },
    );

  return {
    _uuid: timeLogInterfaceData._uuid,
    _startTime: timeLogInterfaceData._startTime,
    _endTime: timeLogInterfaceData._endTime,
    _description: timeLogInterfaceData._description,
  };
};

export const validateTimeLogsInterfaceData = (timeLogsInterfaceData: any[]): TimeLogInterface[] => timeLogsInterfaceData
  .map(
    (timeLogInterfaceData: any) => validateTimeLogInterfaceData(timeLogInterfaceData),
  );
