import type { TaskBackupUnsupportedMetadata } from '@tasks/interfaces/task-backup.interface';

export interface ImportTimeLogInput {
  startTime: number;
  endTime?: number;
  description?: string;
}

export interface ImportTaskInput {
  name: string;
  description?: string;
  tags: string[];
  timeLogs: ImportTimeLogInput[];
  unsupportedMetadata?: TaskBackupUnsupportedMetadata;
}
