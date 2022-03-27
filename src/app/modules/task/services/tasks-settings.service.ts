import { Injectable }              from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { TasksSettingsDialogComponent } from '@task/components/settings-dialog/tasks-settings-dialog.component';
import { TaskInterface }                from '@task/interfaces/task.interface';
import { Task }                         from '@task/models/task.model';

@Injectable()
export class TasksSettingsService {
  private dialogRef!: MatDialogRef<TasksSettingsDialogComponent, TaskInterface[] | undefined>;

  constructor(
    private dialog: MatDialog,
  ) {
  }

  public openDialog(currentTasks: Task[]): Observable<TaskInterface[] | undefined> {
    this.dialogRef = this.dialog.open(
      TasksSettingsDialogComponent,
      {
        data: {
          currentTasks,
        },
      },
    );

    return this.dialogRef.afterClosed();
  }
}
