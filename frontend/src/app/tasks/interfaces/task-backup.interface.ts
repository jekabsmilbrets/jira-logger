export interface TaskBackupV2 {
  version: 2;
  exportedAt: number;
  tasks: TaskBackupTask[];
}

export interface TaskBackupTask {
  name: string;
  description?: string | null;
  timeLogs: TaskBackupTimeLog[];
  tags: TaskBackupTagRef[];
  metadata?: TaskBackupUnsupportedMetadata;
}

export interface TaskBackupTimeLog {
  startTime: number;
  endTime?: number | null;
  description?: string | null;
}

export interface TaskBackupTagRef {
  id?: string;
  name: string;
}

export interface TaskBackupJiraWorkLog {
  id?: string;
  workLogId?: string;
  description?: string | null;
  startTime: number;
  timeSpentSeconds: number;
}

export interface TaskBackupSourceMetadataEntry {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface TaskBackupUnsupportedMetadata {
  task?: TaskBackupSourceMetadataEntry;
  timeLogs?: TaskBackupSourceMetadataEntry[];
  tags?: TaskBackupSourceMetadataEntry[];
  lastTimeLog?: TaskBackupTimeLog | null;
  jiraWorkLogs?: TaskBackupJiraWorkLog[];
  timeLogged?: number | null;
}
