import { Tag } from '@shared/models/tag.model';

export interface TaskFormValue {
  description: string;
  name: string;
  tags: Tag[];
}
