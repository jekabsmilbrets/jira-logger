import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { validateTasksInterfaceData } from '@tasks/data-validators/task-interface.validator';
import { TasksSettingsDialogDataInterface } from '@tasks/interfaces/tasks-settings-dialog-data.interface';

import { take } from 'rxjs';

@Component(
  {
    selector: 'tasks-settings-dialog',
    templateUrl: './tasks-settings-dialog.component.html',
    styleUrls: ['./tasks-settings-dialog.component.scss'],
    standalone: false,
  },
)
export class TasksSettingsDialogComponent {
  public formGroup: FormGroup<{ json: FormControl<string | null> }> = new FormGroup<{
    json: FormControl<string | null>
  }>(
    {
      json: new FormControl<string | null>(null, Validators.required),
    },
  );
  public showCurrent = false;

  constructor(
    private dialogRef: MatDialogRef<TasksSettingsDialogComponent, ApiTask[] | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: TasksSettingsDialogDataInterface,
    private tagsService: TagsService,
  ) {
  }

  public onClose(): void {
    this.dialogRef.close();
  }

  public onImport(): void {
    if (this.formGroup.invalid) {
      return;
    }

    let data: ApiTask[];

    try {
      this.tagsService.tags$
        .pipe(
          take(1),
        )
        .subscribe(
          (tags: Tag[]) => {
            data = validateTasksInterfaceData(
              JSON.parse(
                this.formGroup.getRawValue().json as string,
              ),
              tags,
            );

            this.dialogRef.close(data);
          },
        );
    } catch (e) {
      console.error({ e });
    }
  }
}
