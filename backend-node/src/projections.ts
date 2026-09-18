import { db } from './db.js';
import { atom, userTimezone } from './dates.js';
import type { Timestamps, TimerRow, TagRow, TaskRow, JiraWorkLogRow } from './models.js';
import type { TaskRelations } from './tasks.repository.js';

export function timestamps(row: Timestamps, zone: string) {
  return { id: row.id, createdAt: atom(row.created_at, zone), updatedAt: atom(row.updated_at, zone) };
}
export function timerView(row: TimerRow, zone: string) {
  return { ...timestamps(row, zone), startTime: atom(row.start_time, zone), endTime: atom(row.end_time, zone), description: row.description, manuallyModified: false, originalStartTime: null as string | null, originalEndTime: null as string | null };
}
export function tagView(row: TagRow, zone: string) {
  return { ...timestamps(row, zone), name: row.name, isUsed: Boolean(row.is_used) };
}
export function jiraView(row: JiraWorkLogRow, zone: string) {
  return { ...timestamps(row, zone), workLogId: row.work_log_id, description: row.description, timeSpentSeconds: row.time_spent_seconds, startTime: atom(row.start_time, zone) };
}
export function lastTimer<T extends { startTime: string | null; endTime: string | null; createdAt: string | null }>(timers: T[]): T | null {
  const sorted = [...timers].sort((a, b) => Date.parse(b.startTime!) - Date.parse(a.startTime!) || Date.parse(b.createdAt!) - Date.parse(a.createdAt!));
  return sorted.find(timer => timer.endTime === null) ?? sorted[0] ?? null;
}
export async function taskView(row: TaskRow, zone?: string) {
  zone ??= await userTimezone();
  const timers = (await db.query<TimerRow>('SELECT * FROM time_log WHERE task_id=$1', [row.id])).rows.map(timer => timerView(timer, zone));
  const tags = (await db.query<TagRow>('SELECT t.*,true AS is_used FROM tag t JOIN tag_task j ON j.tag_id=t.id WHERE j.task_id=$1', [row.id])).rows.map(tag => tagView(tag, zone));
  const logs = (await db.query<JiraWorkLogRow>('SELECT * FROM jira_work_log WHERE task_id=$1', [row.id])).rows.map(log => jiraView(log, zone));
  return { ...timestamps(row, zone), name: row.name, description: row.description, timeLogs: timers, tags, jiraWorkLogs: logs, lastTimeLog: lastTimer(timers) };
}

export class ResponseMapper {
  task(row: TaskRow, relations: TaskRelations, zone: string): TaskResponse {
    const timers = relations.timers.map(timer => timerView(timer, zone));
    return { ...timestamps(row, zone), name: row.name, description: row.description, timeLogs: timers,
      tags: relations.tags.map(tag => tagView(tag, zone)), jiraWorkLogs: relations.logs.map(log => jiraView(log, zone)), lastTimeLog: lastTimer(timers) };
  }
}
export type TaskResponse = Awaited<ReturnType<typeof taskView>>;
