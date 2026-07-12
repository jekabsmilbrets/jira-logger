import type { TaskBackupUnsupportedMetadata } from '@tasks/interfaces/task-backup.interface';

export type UnsupportedMetadataField = keyof TaskBackupUnsupportedMetadata;

export type UnsupportedMetadataValue = TaskBackupUnsupportedMetadata[UnsupportedMetadataField];
