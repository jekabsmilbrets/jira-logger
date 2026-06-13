import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { take } from 'rxjs';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { validateTasksInterfaceData } from '@tasks/data-validators/task-interface.validator';
import { TaskSettingsFormData } from '@tasks/interfaces/task-settings-form-data.interface';
import { TasksSettingsDialogDataInterface } from '@tasks/interfaces/tasks-settings-dialog-data.interface';
import { TasksSettingsFormValue } from '@tasks/interfaces/tasks-settings-form-value.interface';

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
    JsonPipe,
    FormField,
  ],
})
export class TasksSettingsDialogComponent {
  protected data: TasksSettingsDialogDataInterface = inject<TasksSettingsDialogDataInterface>(MAT_DIALOG_DATA);
  protected readonly tasksSettingsFormModel = signal<TasksSettingsFormValue>({
    json: '',
  });
  protected readonly tasksSettingsForm = form(this.tasksSettingsFormModel, (path) => {
    required(path.json, { message: 'JSON is required.' });
  });

  protected showCurrent: boolean = false;

  private dialogRef: MatDialogRef<TasksSettingsDialogComponent, undefined | ApiTask[]> = inject<MatDialogRef<TasksSettingsDialogComponent, ApiTask[] | undefined>>(MatDialogRef);

  private readonly tagsService: TagsService = inject(TagsService);

  protected onClose(): void {
    this.dialogRef.close();
  }

  protected onImport(): void {
    if (this.tasksSettingsForm().invalid()) {
      this.tasksSettingsForm().markAsTouched();
      return;
    }

    let data: ApiTask[];
    const formData: TaskSettingsFormData = this.tasksSettingsFormModel();

    this.tagsService.tags$
      .pipe(take(1))
      .subscribe((tags: Tag[]) => {
        try {
          data = validateTasksInterfaceData(
            JSON.parse(
              formData.json as string,
            ),
            tags,
          );

          this.dialogRef.close(data);
        } catch (e) {
          console.error({ e });
        }
      });
  }
}
