import type { TagsRepository } from '../../tags.repository.js';

export type TagsStore = Pick<TagsRepository, 'list' | 'find' | 'resolve' | 'save' | 'delete'>;
