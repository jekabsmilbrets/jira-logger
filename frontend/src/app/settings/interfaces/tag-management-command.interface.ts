import { Tag } from '@shared/models/tag.model';

export interface TagManagementCommand {
  action: 'create' | 'update' | 'delete';
  tag: Tag;
}
