import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';
import { TimeLog } from '@shared/models/time-log.model';

export const adaptTimeLog: (dbTimeLog: ApiTimeLog) => TimeLog = (dbTimeLog: ApiTimeLog): TimeLog =>
  new TimeLog({
    id: dbTimeLog.id,
    endTime: dbTimeLog.endTime && new Date(dbTimeLog.endTime),
    startTime: dbTimeLog.startTime && new Date(dbTimeLog.startTime),
    description: dbTimeLog.description,
  });

export const adaptTimeLogs: (dbTimeLogs: ApiTimeLog[]) => TimeLog[] = (dbTimeLogs: ApiTimeLog[]): TimeLog[] => dbTimeLogs.map(
  (dbTimeLog: ApiTimeLog) => adaptTimeLog(dbTimeLog),
);
