import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import type { TaskBackupTagRef, TaskBackupTask } from '@tasks/interfaces/task-backup.interface';

import type { TaskBackupExportMetadata } from './task-backup-unsupported-metadata';

type ReadExportMetadata = (task: Task) => TaskBackupExportMetadata;

export const serializeTaskBackup: (tasks: Task[], readExportMetadata: ReadExportMetadata) => string = (
  tasks: Task[],
  readExportMetadata: ReadExportMetadata,
): string => JSON.stringify(
  {
    version: 2,
    exportedAt: Date.now(),
    tasks: tasks.map((task: Task) => toBackupTask(task, readExportMetadata)),
  },
  null,
  2,
);

const toBackupTask: (task: Task, readExportMetadata: ReadExportMetadata) => TaskBackupTask = (
  task: Task,
  readExportMetadata: ReadExportMetadata,
): TaskBackupTask => {
  const backupMetadata: TaskBackupExportMetadata = readExportMetadata(task);

  return {
    name: task.name,
    description: task.description ?? null,
    timeLogs: backupMetadata.timeLogs,
    tags: task.tags.map((tag: Tag): TaskBackupTagRef => ({
      id: tag.id,
      name: tag.name,
    })),
    metadata: backupMetadata.metadata,
  };
};
