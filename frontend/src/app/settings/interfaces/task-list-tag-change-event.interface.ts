import { Tag } from '@shared/models/tag.model';

export interface TaskListTagChangeEvent {
  action: 'create' | 'update' | 'delete';
  successMessage: string;
  tag: Tag;
}
