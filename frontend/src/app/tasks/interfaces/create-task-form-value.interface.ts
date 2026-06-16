import { Tag } from '@shared/models/tag.model';

export interface CreateTaskFormValue {
  description: string;
  name: string;
  tags: Tag[];
}
