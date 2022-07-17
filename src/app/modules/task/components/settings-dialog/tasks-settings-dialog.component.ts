import { Component, Inject }                  from '@angular/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA }      from '@angular/material/dialog';

import { validateTasksInterfaceData } from '@task/data-validators/task-interface.validator';

import { TaskInterface }                    from '@task/interfaces/task.interface';
import { TasksSettingsDialogDataInterface } from '@task/interfaces/tasks-settings-dialog-data.interface';

@Component({
             selector: 'app-settings-dialog',
             templateUrl: './tasks-settings-dialog.component.html',
             styleUrls: ['./tasks-settings-dialog.component.scss'],
           })
export class TasksSettingsDialogComponent {
  public formGroup: FormGroup<{ json: FormControl<string | null> }> = new FormGroup<{ json: FormControl<string | null> }>(
    {
      json: new FormControl<string | null>(null, Validators.required),
    },
  );
  public showCurrent = false;

  constructor(
    private dialogRef: MatDialogRef<TasksSettingsDialogComponent, TaskInterface[] | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: TasksSettingsDialogDataInterface,
  ) {
  }

  public onClose(): void {
    this.dialogRef.close();
  }

  public onImport(): void {
    if (this.formGroup.invalid) {
      return;
    }

    let data: TaskInterface[];

    try {
      data = validateTasksInterfaceData(
        JSON.parse(
          this.formGroup.getRawValue().json as string,
        ),
      );

      this.dialogRef.close(data);
    }
    catch (e) {
      console.error({e});
    }
  }
}
