import { Injectable }              from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { TasksSettingsDialogComponent } from '@task/components/settings-dialog/tasks-settings-dialog.component';
import { TaskInterface }                from '@task/interfaces/task.interface';

@Injectable()
export class TasksSettingsService {
  private dialogRef!: MatDialogRef<TasksSettingsDialogComponent, TaskInterface[] | undefined>;

  constructor(
    private dialog: MatDialog,
  ) {
  }

  public openDialog(): Observable<TaskInterface[] | undefined> {
    this.dialogRef = this.dialog.open(
      TasksSettingsDialogComponent,
    );

    return this.dialogRef.afterClosed();
  }
}
