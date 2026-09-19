import type { TimerRow } from '../../database/records.types.js';
import type { MaintenanceRepository } from '../../maintenance.repository.js';

export interface AuditResult {
  duplicates: { task_id: string; start_time: string; work_log_id: string; duplicate_count: string }[];
  invalidTimeLogs: Pick<TimerRow, 'id' | 'task_id' | 'start_time' | 'end_time'>[];
}

export type MaintenanceStore = Pick<MaintenanceRepository, 'seed' | 'createDatabase' | 'audit'>;

export interface MigrationVersion { version: string; executed_at: string | null; execution_time: number | null; }
