import type { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { Tag } from '@shared/models/tag.model';

import type { TagInterfaceData, TagsInterfaceData } from '@tasks/interfaces/imported-task-data.interface';

export const validateTagInterfaceData: (tagInterfaceData: TagInterfaceData, tags: Tag[]) => (ApiTag | undefined) = (
  tagInterfaceData: TagInterfaceData,
  tags: Tag[],
): ApiTag | undefined => {
  if (!tagInterfaceData) {
    return undefined;
  }

  return toApiTag(
    typeof tagInterfaceData === 'string' ?
      findTagByName(tags, tagInterfaceData) :
      findTagByReference(tags, tagInterfaceData),
  );
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

const findTagByName: (tags: Tag[], name: string) => Tag | undefined = (
  tags: Tag[],
  name: string,
): Tag | undefined => tags.find(
  (tag: Tag) => tag.name.toLowerCase() === name.toLowerCase(),
);

const findTagByReference: (tags: Tag[], tagInterfaceData: Exclude<TagInterfaceData, string | undefined | null>) => Tag | undefined = (
  tags: Tag[],
  tagInterfaceData: Exclude<TagInterfaceData, string | undefined | null>,
): Tag | undefined => {
  const candidateIds: Set<string> = new Set<string>(
    [tagInterfaceData.id, tagInterfaceData._id].filter(
      (id: string | undefined): id is string => typeof id === 'string',
    ),
  );
  const candidateName: string | undefined = tagInterfaceData._name ?? tagInterfaceData.name;

  return tags.find(
    (tag: Tag) => candidateIds.has(tag.id) || tag.name === candidateName,
  );
};

const toApiTag: (tag: Tag | undefined) => ApiTag | undefined = (
  tag: Tag | undefined,
): ApiTag | undefined => tag ?
  {
    id: tag.id,
    name: tag.name,
  } as ApiTag :
  undefined;
