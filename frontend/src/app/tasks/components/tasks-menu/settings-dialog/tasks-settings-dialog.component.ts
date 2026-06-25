import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, type WritableSignal } from '@angular/core';
import { type FieldTree, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { TaskSettingsFormData } from '@tasks/interfaces/task-settings-form-data.interface';
import type { TasksSettingsDialogData } from '@tasks/interfaces/tasks-settings-dialog-data.interface';
import type { TasksSettingsFormValue } from '@tasks/interfaces/tasks-settings-form-value.interface';
import { prepareTaskImportRequest, stringifyTaskBackupV2 } from '@tasks/utilities/task-backup.utility';

@Component({
  selector: 'tasks-settings-dialog',
  templateUrl: './tasks-settings-dialog.component.html',
  styleUrls: ['./tasks-settings-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatButtonModule,
    CdkCopyToClipboard,
    MatFormFieldModule,
    MatInputModule,
    FormField,
  ],
})
export class TasksSettingsDialogComponent {
  protected readonly data: TasksSettingsDialogData = inject<TasksSettingsDialogData>(MAT_DIALOG_DATA);
  protected readonly tasksSettingsFormModel: WritableSignal<TasksSettingsFormValue> = signal<TasksSettingsFormValue>({
    json: '',
  });
  protected readonly tasksSettingsForm: FieldTree<TasksSettingsFormValue> = form(this.tasksSettingsFormModel, (path) => {
    required(path.json, { message: 'JSON is required.' });
  });
  protected readonly importErrorMessage: WritableSignal<string | null> = signal<string | null>(null);
  protected readonly currentBackupJson: WritableSignal<string> = signal<string>('');

  protected showCurrent: boolean = false;

  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly dialogRef: MatDialogRef<TasksSettingsDialogComponent, undefined | TaskImportRequest> = inject<MatDialogRef<TasksSettingsDialogComponent, TaskImportRequest | undefined>>(MatDialogRef);
  private readonly tagsService: TagsService = inject(TagsService);

  constructor() {
    this.loadCurrentBackupJson();
  }

  protected onClose(): void {
    this.dialogRef.close();
  }

  protected onImport(): void {
    if (this.tasksSettingsForm().invalid()) {
      this.tasksSettingsForm().markAsTouched();
      return;
    }

    const formData: TaskSettingsFormData = this.tasksSettingsFormModel();
    const tags: Tag[] = this.tagsService.tags();
    this.importErrorMessage.set(null);

    try {
      const request: TaskImportRequest = prepareTaskImportRequest(
        JSON.parse(
          formData.json as string,
        ),
        this.data.currentTasks,
        tags,
      );

      this.dialogRef.close(request);
    } catch (e) {
      this.importErrorMessage.set(e instanceof Error ? e.message : 'Import failed.');
    }
  }

  private loadCurrentBackupJson(): void {
    try {
      if (this.destroyRef.destroyed) {
        return;
      }

      this.currentBackupJson.set(stringifyTaskBackupV2(this.data.currentTasks));
    } catch (error) {
      if (this.destroyRef.destroyed || this.isDestroyedInjectorError(error)) {
        return;
      }

      throw error;
    }
  }

  private isDestroyedInjectorError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('NG0205');
  }
}
