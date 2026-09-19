export interface TimestampResponse { id: string; createdAt: string | null; updatedAt: string | null; }

export interface TimerResponse extends TimestampResponse {
  startTime: string | null; endTime: string | null; description: string | null;
  manuallyModified: boolean; originalStartTime: string | null; originalEndTime: string | null;
}

export type TimerOrdering = Pick<TimerResponse, 'startTime' | 'endTime' | 'createdAt'>;

export interface TodayTotalResponse { totalSeconds: number; }

export interface TagResponse extends TimestampResponse { name: string; isUsed: boolean; }

export interface JiraWorkLogResponse extends TimestampResponse { workLogId: string; description: string | null; timeSpentSeconds: number; startTime: string | null; }

export interface TaskResponse extends TimestampResponse {
  name: string; description: string | null; timeLogs: TimerResponse[]; tags: TagResponse[];
  jiraWorkLogs: JiraWorkLogResponse[]; lastTimeLog: TimerResponse | null;
}
