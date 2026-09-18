import { db } from './db.js';
import { atom, userTimezone } from './dates.js';

export type Row = Record<string, any>;
export function timestamps(row: Row, zone: string) {
  return { id: row.id, createdAt: atom(row.created_at, zone), updatedAt: atom(row.updated_at, zone) };
}
export function timerView(row: Row, zone: string) {
  return { ...timestamps(row, zone), startTime: atom(row.start_time, zone), endTime: atom(row.end_time, zone), description: row.description, manuallyModified: false, originalStartTime: null as string | null, originalEndTime: null as string | null };
}
export function tagView(row: Row, zone: string) {
  return { ...timestamps(row, zone), name: row.name, isUsed: Boolean(row.is_used) };
}
export function jiraView(row: Row, zone: string) {
  return { ...timestamps(row, zone), workLogId: row.work_log_id, description: row.description, timeSpentSeconds: row.time_spent_seconds, startTime: atom(row.start_time, zone) };
}
export function lastTimer<T extends { startTime: string | null; endTime: string | null; createdAt: string | null }>(timers: T[]): T | null {
  const sorted = [...timers].sort((a, b) => Date.parse(b.startTime!) - Date.parse(a.startTime!) || Date.parse(b.createdAt!) - Date.parse(a.createdAt!));
  return sorted.find(timer => timer.endTime === null) ?? sorted[0] ?? null;
}
export async function taskView(row: Row, zone?: string) {
  zone ??= await userTimezone();
  const timers = (await db.query('SELECT * FROM time_log WHERE task_id=$1', [row.id])).rows.map(timer => timerView(timer, zone));
  const tags = (await db.query('SELECT t.*,true AS is_used FROM tag t JOIN tag_task j ON j.tag_id=t.id WHERE j.task_id=$1', [row.id])).rows.map(tag => tagView(tag, zone));
  const logs = (await db.query('SELECT * FROM jira_work_log WHERE task_id=$1', [row.id])).rows.map(log => jiraView(log, zone));
  return { ...timestamps(row, zone), name: row.name, description: row.description, timeLogs: timers, tags, jiraWorkLogs: logs, lastTimeLog: lastTimer(timers) };
}
