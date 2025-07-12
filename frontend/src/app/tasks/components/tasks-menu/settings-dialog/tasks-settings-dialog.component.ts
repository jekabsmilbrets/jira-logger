import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { validateTasksInterfaceData } from '@tasks/data-validators/task-interface.validator';
import { TaskSettingsFormData } from '@tasks/interfaces/task-settings-form-data.interface';
import { TaskSettingsFormGroup } from '@tasks/interfaces/task-settings-form-group.interface';
import { TasksSettingsDialogDataInterface } from '@tasks/interfaces/tasks-settings-dialog-data.interface';

import { take } from 'rxjs';

@Component({
  selector: 'tasks-settings-dialog',
  templateUrl: './tasks-settings-dialog.component.html',
  styleUrls: ['./tasks-settings-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatButtonModule,
    CdkCopyToClipboard,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    JsonPipe,
  ],
})
export class TasksSettingsDialogComponent {
  protected data: TasksSettingsDialogDataInterface = inject<TasksSettingsDialogDataInterface>(MAT_DIALOG_DATA);

  protected formGroup: FormGroup<TaskSettingsFormGroup> = new FormGroup<TaskSettingsFormGroup>({
    json: new FormControl<string | null>(null, Validators.required),
  });

  protected showCurrent: boolean = false;

  private dialogRef: MatDialogRef<TasksSettingsDialogComponent, undefined | ApiTask[]> = inject<MatDialogRef<TasksSettingsDialogComponent, ApiTask[] | undefined>>(MatDialogRef);

  private readonly tagsService: TagsService = inject(TagsService);

  protected onClose(): void {
    this.dialogRef.close();
  }

  protected onImport(): void {
    if (this.formGroup.invalid) {
      return;
    }

    let data: ApiTask[];
    const formData: TaskSettingsFormData = this.formGroup.getRawValue();

    try {
      this.tagsService.tags$
        .pipe(take(1))
        .subscribe((tags: Tag[]) => {
          data = validateTasksInterfaceData(
            JSON.parse(
              formData.json as string,
            ),
            tags,
          );

          this.dialogRef.close(data);
        });
    } catch (e) {
      console.error({ e });
    }
  }
}
