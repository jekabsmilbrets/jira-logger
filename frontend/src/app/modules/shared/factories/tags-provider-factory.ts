import { Observable }  from 'rxjs';

import { Tag }         from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';


export const tagsProviderFactory = (
  provider: TagsService,
): () => Observable<Tag[]> =>
  () => provider.fetchTags();
