import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { Tag }    from '@shared/models/tag.model';

export const validateTagInterfaceData = (tagInterfaceData: any, tags: Tag[]): ApiTag | undefined => {
  let existingTag;
  if (tagInterfaceData !== null && typeof tagInterfaceData === 'object') {
    existingTag = tags.find(t => t.id === tagInterfaceData?.id);
  } else {
    existingTag = tags.find(t => t.name.toLowerCase() === tagInterfaceData.toLowerCase());
  }

  if (existingTag) {
    return {
      id: existingTag.id,
      name: existingTag.name,
    } as ApiTag;
  }

  return undefined;
};

export const validateTagsInterfaceData = (tagsInterfaceData: any[], tags: Tag[]): ApiTag[] => tagsInterfaceData
  .map(
    (tagInterfaceData: any) => validateTagInterfaceData(tagInterfaceData, tags),
  )
  .filter((tag: ApiTag | undefined): boolean => tag !== undefined)
  .map((tagInterfaceData: ApiTag | undefined) => tagInterfaceData as ApiTag);

