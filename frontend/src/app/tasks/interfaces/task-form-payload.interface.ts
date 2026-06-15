import { Tag } from '@shared/models/tag.model';

export interface TaskFormPayload {
  name?: string | null;
  description?: string | null;
  tags?: Tag[] | null;
}
