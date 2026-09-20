import type { TagsRepository } from '@features/tags/tags.repository';


export type TagsStore = Pick<TagsRepository, 'list' | 'find' | 'resolve' | 'save' | 'delete'>;
