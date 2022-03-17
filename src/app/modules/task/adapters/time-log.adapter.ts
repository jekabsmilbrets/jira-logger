import { TimeLogInterface } from '@task/interfaces/time-log.interface';
import { TimeLog }          from '@task/models/time-log.model';

export const adaptTimeLog = (dbTimeLog: TimeLogInterface): TimeLog => new TimeLog(
  {
    uuid: dbTimeLog._uuid,
    endTime: dbTimeLog._endTime && new Date(dbTimeLog._endTime),
    startTime: dbTimeLog._startTime && new Date(dbTimeLog._startTime),
    description: dbTimeLog._description,
  },
);

export const adaptTimeLogs = (dbTimeLogs: TimeLogInterface[]): TimeLog[] => dbTimeLogs.map(
  (dbTimeLog: TimeLogInterface) => adaptTimeLog(dbTimeLog),
);
