import { firstValueFrom } from 'rxjs';

import { Tag }            from '@shared/models/tag.model';
import { TagsService }    from '@shared/services/tags.service';


export const tagsPreloaderFactory = (
  provider: TagsService,
): () => Promise<Tag[]> =>
  () => firstValueFrom(provider.list());
