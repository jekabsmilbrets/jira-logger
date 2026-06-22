import type { UnsupportedMetadataField, UnsupportedMetadataValue } from '@tasks/types/task-backup-metadata.type';

export interface UnsupportedMetadataParser {
  field: UnsupportedMetadataField;
  parse: () => UnsupportedMetadataValue;
}
