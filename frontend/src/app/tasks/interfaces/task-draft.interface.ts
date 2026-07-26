import { Tag } from '@shared/models/tag.model';

export interface TaskDraft {
  description: string;
  name: string;
  tags: Tag[];
}
