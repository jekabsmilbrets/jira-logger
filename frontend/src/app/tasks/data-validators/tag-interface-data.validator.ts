import type { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { Tag } from '@shared/models/tag.model';

import type { TagInterfaceData, TagsInterfaceData } from '@tasks/interfaces/imported-task-data.interface';

export const validateTagInterfaceData: (tagInterfaceData: TagInterfaceData, tags: Tag[]) => (ApiTag | undefined) = (
  tagInterfaceData: TagInterfaceData,
  tags: Tag[],
): ApiTag | undefined => {
  let existingTag: Tag | undefined;

  if (typeof tagInterfaceData === 'string') {
    existingTag = tags.find(
      (t: Tag) => t.name.toLowerCase() === tagInterfaceData.toLowerCase(),
    );
  } else {
    existingTag = tags.find(
      (t: Tag) => t.id === tagInterfaceData?.id ||
        t.id === tagInterfaceData?._id ||
        t.name === (tagInterfaceData?._name ?? tagInterfaceData?.name),
    );
  }

  if (existingTag) {
    return {
      id: existingTag.id,
      name: existingTag.name,
    } as ApiTag;
  }

  return undefined;
};

export const validateTagsInterfaceData: (tagsInterfaceData: TagsInterfaceData, tags: Tag[]) => ApiTag[] = (
  tagsInterfaceData: TagsInterfaceData,
  tags: Tag[],
): ApiTag[] => tagsInterfaceData
  .map((tagInterfaceData: TagInterfaceData) => validateTagInterfaceData(
    tagInterfaceData,
    tags,
  ))
  .filter((tag: ApiTag | undefined): tag is ApiTag => tag !== undefined);
