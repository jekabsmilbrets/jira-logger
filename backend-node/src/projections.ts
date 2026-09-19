import type { DateCodec } from './dates.js';
import type { Timestamps, TimerRow, TagRow, TaskRow, JiraWorkLogRow } from './models.js';
import type { TaskRelations } from './tasks.repository.js';

export interface TimestampResponse { id: string; createdAt: string | null; updatedAt: string | null; }
export interface TimerResponse extends TimestampResponse {
  startTime: string | null; endTime: string | null; description: string | null;
  manuallyModified: boolean; originalStartTime: string | null; originalEndTime: string | null;
}
export interface TagResponse extends TimestampResponse { name: string; isUsed: boolean; }
export interface JiraWorkLogResponse extends TimestampResponse { workLogId: string; description: string | null; timeSpentSeconds: number; startTime: string | null; }
export interface TaskResponse extends TimestampResponse {
  name: string; description: string | null; timeLogs: TimerResponse[]; tags: TagResponse[];
  jiraWorkLogs: JiraWorkLogResponse[]; lastTimeLog: TimerResponse | null;
}
export function lastTimer<T extends { startTime: string | null; endTime: string | null; createdAt: string | null }>(timers: T[]): T | null {
  const sorted = [...timers].sort((a, b) => Date.parse(b.startTime ?? '') - Date.parse(a.startTime ?? '') || Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));
  return sorted.find(timer => timer.endTime === null) ?? sorted[0] ?? null;
}
export class ResponseMapper {
  constructor(private readonly dates: DateCodec) { }
  private timestamps(row: Timestamps, zone: string): TimestampResponse {
    return { id: row.id, createdAt: this.dates.atom(row.created_at, zone), updatedAt: this.dates.atom(row.updated_at, zone) };
  }
  timer(row: TimerRow, zone: string): TimerResponse {
    return {
      ...this.timestamps(row, zone), startTime: this.dates.atom(row.start_time, zone), endTime: this.dates.atom(row.end_time, zone), description: row.description,
      manuallyModified: false, originalStartTime: null, originalEndTime: null
    };
  }
  tag(row: TagRow, zone: string): TagResponse { return { ...this.timestamps(row, zone), name: row.name, isUsed: Boolean(row.is_used) }; }
  jira(row: JiraWorkLogRow, zone: string): JiraWorkLogResponse {
    return { ...this.timestamps(row, zone), workLogId: row.work_log_id, description: row.description, timeSpentSeconds: row.time_spent_seconds, startTime: this.dates.atom(row.start_time, zone) };
  }
  task(row: TaskRow, relations: TaskRelations, zone: string): TaskResponse {
    const timers = relations.timers.map(timer => this.timer(timer, zone));
    return {
      ...this.timestamps(row, zone), name: row.name, description: row.description, timeLogs: timers,
      tags: relations.tags.map(tag => this.tag(tag, zone)), jiraWorkLogs: relations.logs.map(log => this.jira(log, zone)), lastTimeLog: lastTimer(timers)
    };
  }
}
