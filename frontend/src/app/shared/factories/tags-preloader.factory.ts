import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';
import { firstValueFrom } from 'rxjs';

export const tagsPreloaderFactory: (provider: TagsService) => () => Promise<Tag[]> =
  (
    provider: TagsService,
  ): (() => Promise<Tag[]>) => () => firstValueFrom(
    provider.list(),
  );
