import { FormControl } from '@angular/forms';
import { Tag } from '@shared/models/tag.model';

export interface TaskFormGroup {
  name: FormControl<string | null>;
  description: FormControl<string | null>;
  tags: FormControl<Tag[] | null>;
}
