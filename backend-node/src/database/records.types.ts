export interface Timestamps {
  id: string;
  created_at: number;
  updated_at: number;
}

export interface SettingRow {
  id: string;
  name: string;
  value: string;
}

export interface TagRow extends Timestamps {
  name: string;
  is_used?: boolean;
}

export interface TaskRow extends Timestamps {
  name: string;
  description: string | null;
}

export interface TimerRow extends Timestamps {
  task_id: string;
  start_time: number;
  end_time: number | null;
  description: string | null;
}

export interface JiraWorkLogRow extends Timestamps {
  task_id: string;
  work_log_id: string;
  description: string | null;
  time_spent_seconds: number;
  start_time: string;
}

export interface TimerWrite {
  id: string;
  taskId: string;
  start: number | null;
  end: number | null;
  description: string | null;
}

export interface TaskWrite {
  id: string;
  name: string;
  description: string | null;
}
