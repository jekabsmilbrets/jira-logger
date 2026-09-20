export interface Timestamps {
  id: string;
  created_at: string;
  updated_at: string;
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
  start_time: string;
  end_time: string | null;
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
  start: string | null;
  end: string | null;
  description: string | null;
}

export interface TaskWrite {
  id: string;
  name: string;
  description: string | null;
}
