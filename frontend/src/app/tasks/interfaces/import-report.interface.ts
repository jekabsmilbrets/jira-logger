import type { ImportTaskInput } from '@tasks/interfaces/import-task-input.interface';
import type { TaskBackupUnsupportedMetadata } from '@tasks/interfaces/task-backup.interface';

export interface ImportWarning {
  code: 'unsupported-metadata';
  taskName: string;
  fields: string[];
  message: string;
  metadata?: TaskBackupUnsupportedMetadata;
}

export interface TaskImportRequest {
  tasks: ImportTaskInput[];
  warnings: ImportWarning[];
}

export interface ImportReport {
  status: 'success' | 'blocked';
  createdTaskCount: number;
  createdTagCount: number;
  createdTimeLogCount: number;
  warnings: ImportWarning[];
  errors: string[];
}
