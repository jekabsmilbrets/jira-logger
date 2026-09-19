import type { TimerOrdering } from './responses.types.js';

export function lastTimer<T extends TimerOrdering>(timers: T[]): T | null {
  const sorted = [...timers].sort((a, b) => Date.parse(b.startTime ?? '') - Date.parse(a.startTime ?? '') || Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));
  return sorted.find(timer => timer.endTime === null) ?? sorted[0] ?? null;
}
