import { Setting } from '@core/models/setting.model';
import { KeyValueEntry } from '@core/types/key-value-entry.type';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

export type ErrorDialogIdbData = Setting[] | Tag[] | Task[] | KeyValueEntry[] | null;
