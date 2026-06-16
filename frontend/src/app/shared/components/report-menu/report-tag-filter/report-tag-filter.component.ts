import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import { disabled, type FieldTree, form } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { ReportTagFormValue } from '@report/interfaces/report-tag-form-value.interface';

@Component({
  selector: 'shared-report-tag-filter',
  templateUrl: './report-tag-filter.component.html',
  styleUrls: ['./report-tag-filter.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
  ],
})
export class ReportTagFilterComponent {
  public readonly showLabel: InputSignal<boolean> = input<boolean>(false);
  public readonly disabled: InputSignal<boolean | null | undefined> = input<boolean | null>();
  public readonly tags: InputSignal<Tag[] | null | undefined> = input<Tag[] | null>();

  protected readonly reportTagFormModel: WritableSignal<ReportTagFormValue> = signal<ReportTagFormValue>({
    tags: null,
  });
  protected readonly reportTagForm: FieldTree<ReportTagFormValue> = form(this.reportTagFormModel, (path) => {
    disabled(path, () => !!this.disabled());
  });

  protected readonly tagChange: OutputEmitterRef<Tag[]> = output<Tag[]>();

  private readonly tagsService: TagsService = inject(TagsService);
  protected readonly availableTags: Signal<Tag[]> = this.tagsService.tags;

  constructor() {
    effect(() => {
      const tags: Tag[] | null | undefined = this.tags();
      this.reportTagForm().reset({
        tags: tags ?? null,
      });
    });
  }

  protected tagValueChange(
    value: Tag[],
  ): void {
    const field: ReturnType<typeof this.reportTagForm.tags> = this.reportTagForm.tags();
    field.value.set(value);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
    this.tagChange.emit(value);
  }
}
