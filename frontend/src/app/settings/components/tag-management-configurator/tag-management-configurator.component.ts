import { ChangeDetectionStrategy, Component, effect, inject, input, type InputSignal, output, type OutputEmitterRef, signal, type WritableSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { take } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';

import type { TaskListTagChangeEvent } from '@settings/interfaces/task-list-tag-change-event.interface';

@Component({
  selector: 'settings-tag-management-configurator',
  templateUrl: './tag-management-configurator.component.html',
  styleUrls: ['./tag-management-configurator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class TagManagementConfiguratorComponent {
  private readonly areYouSureService: AreYouSureService = inject(AreYouSureService);

  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly tags: InputSignal<Tag[]> = input<Tag[]>([]);

  protected readonly tagChange: OutputEmitterRef<TaskListTagChangeEvent> = output<TaskListTagChangeEvent>();
  protected readonly newTagName: WritableSignal<string> = signal('');
  protected readonly editedTagNames: WritableSignal<Record<string, string>> = signal<Record<string, string>>({});
  protected readonly editingTagId: WritableSignal<string | null> = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.editedTagNames.set(
        Object.fromEntries(
          this.tags().map((tag: Tag) => [
            tag.id,
            tag.name,
          ]),
        ),
      );
    });
  }

  protected onNewTagNameInput(value: string): void {
    this.newTagName.set(value);
  }

  protected onTagNameInput(
    tagId: string,
    value: string,
  ): void {
    this.editedTagNames.update((tagNames: Record<string, string>) => ({
      ...tagNames,
      [tagId]: value,
    }));
  }

  protected onStartEdit(tag: Tag): void {
    if (this.disabled()) {
      return;
    }

    this.editedTagNames.update((tagNames: Record<string, string>) => ({
      ...tagNames,
      [tag.id]: tag.name,
    }));
    this.editingTagId.set(tag.id);
  }

  protected onCancelEdit(tag: Tag): void {
    this.editedTagNames.update((tagNames: Record<string, string>) => ({
      ...tagNames,
      [tag.id]: tag.name,
    }));
    this.editingTagId.set(null);
  }

  protected onCreateTag(): void {
    const name: string = this.trimmedTagName(this.newTagName());

    if (!this.isValidTagName(name) || this.disabled()) {
      return;
    }

    this.tagChange.emit({
      action: 'create',
      successMessage: 'Successfully created tag!',
      tag: new Tag({ name }),
    });
    this.newTagName.set('');
  }

  protected onSaveTag(tag: Tag): void {
    const name: string = this.getEditedTagName(tag);

    if (this.isSaveDisabled(tag)) {
      return;
    }

    this.tagChange.emit({
      action: 'update',
      successMessage: 'Successfully updated tag!',
      tag: new Tag({
        id: tag.id,
        isUsed: tag.isUsed,
        name,
      }),
    });
    this.editingTagId.set(null);
  }

  protected onDeleteTag(tag: Tag): void {
    if (this.isDeleteDisabled(tag)) {
      return;
    }

    this.areYouSureService.openDialog(tag.name)
      .pipe(take(1))
      .subscribe((confirmed: boolean | undefined) => {
        if (!confirmed) {
          return;
        }

        this.tagChange.emit({
          action: 'delete',
          successMessage: 'Successfully deleted tag!',
          tag,
        });
      });
  }

  protected isCreateDisabled(): boolean {
    return this.disabled() || !this.isValidTagName(this.trimmedTagName(this.newTagName()));
  }

  protected isEditingTag(tag: Tag): boolean {
    return this.editingTagId() === tag.id;
  }

  protected isSaveDisabled(tag: Tag): boolean {
    const editedTagName: string = this.getEditedTagName(tag);

    return this.disabled() ||
      !this.isValidTagName(editedTagName) ||
      editedTagName === this.trimmedTagName(tag.name);
  }

  protected isDeleteDisabled(tag: Tag): boolean {
    return this.disabled() || tag.isUsed;
  }

  protected getTagNameValue(tag: Tag): string {
    return this.editedTagNames()[tag.id] ?? tag.name;
  }

  private getEditedTagName(tag: Tag): string {
    return this.trimmedTagName(this.getTagNameValue(tag));
  }

  private isValidTagName(name: string): boolean {
    return name.length >= 3 && name.length <= 255;
  }

  private trimmedTagName(name: string): string {
    return name.trim();
  }
}
