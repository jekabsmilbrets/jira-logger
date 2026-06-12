import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { Observable } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

@Component({
  selector: 'shared-report-tag-filter',
  templateUrl: './report-tag-filter.component.html',
  styleUrls: ['./report-tag-filter.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    AsyncPipe,
  ],
})
export class ReportTagFilterComponent {
  public readonly showLabel: InputSignal<boolean> = input<boolean>(false);

  protected tags$: Observable<Tag[]>;

  protected tagFormControl: FormControl<Tag[] | null> = new FormControl<Tag[] | null>(null);

  protected readonly tagChange: OutputEmitterRef<Tag[]> = output<Tag[]>();

  private readonly tagsService: TagsService = inject(TagsService);

  constructor() {
    this.tags$ = this.tagsService.tags$;
  }

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input()
  public set disabled(
    disabled: boolean | null,
  ) {
    if (disabled) {
      this.tagFormControl.disable();
    } else {
      this.tagFormControl.enable();
    }
  }

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input()
  public set tags(
    tags: Tag[] | null,
  ) {
    if (tags) {
      this.tagFormControl.setValue(
        tags,
        {
          emitEvent: false,
        },
      );
    }
  }

  protected tagValueChange(
    value: Tag[],
  ): void {
    this.tagChange.emit(value);
  }
}
