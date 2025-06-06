import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { Tag } from '@shared/models/tag.model';

export const adaptTag = (apiTag: ApiTag): Tag => new Tag(
  {
    id: apiTag.id,
    name: apiTag.name,
    createdAt: apiTag.createdAt ? new Date(apiTag.createdAt) : undefined,
    updatedAt: apiTag.updatedAt ? new Date(apiTag.updatedAt) : undefined,
  },
);

export const adaptTags = (apiTags: ApiTag[]): Tag[] => apiTags
  .map((apiTag: ApiTag) => adaptTag(apiTag));
