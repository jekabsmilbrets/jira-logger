import { FormControl } from '@angular/forms';

export interface TimeLogFormGroup {
  startTime: FormControl<Date | null>;
  endTime: FormControl<Date | null>;
  description: FormControl<string | null>;
}
