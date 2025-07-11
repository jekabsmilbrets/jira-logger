import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { Tag } from '@shared/models/tag.model';

export const validateTagInterfaceData: (tagInterfaceData: any, tags: Tag[]) => (ApiTag | undefined) = (
  tagInterfaceData: any,
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

export const validateTagsInterfaceData: (tagsInterfaceData: any[], tags: Tag[]) => ApiTag[] = (
  tagsInterfaceData: any[],
  tags: Tag[],
): ApiTag[] => tagsInterfaceData
  .map((tagInterfaceData: any) => validateTagInterfaceData(
    tagInterfaceData,
    tags,
  ))
  .filter((tag: ApiTag | undefined): boolean => tag !== undefined)
  .map((tagInterfaceData: ApiTag | undefined) => tagInterfaceData as ApiTag);
