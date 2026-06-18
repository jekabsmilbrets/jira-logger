import type { TaskBackupUnsupportedMetadata } from '@tasks/interfaces/task-backup.interface';

export type TimestampResolver = (value: string) => number | undefined;

export type UnsupportedMetadataField = keyof TaskBackupUnsupportedMetadata;

export type UnsupportedMetadataValue = TaskBackupUnsupportedMetadata[UnsupportedMetadataField];
