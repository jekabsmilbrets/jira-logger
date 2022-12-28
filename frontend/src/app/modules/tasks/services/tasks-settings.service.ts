import { Injectable }              from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Task }    from '@shared/models/task.model';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';


@Injectable()
export class TasksSettingsService {
  private dialogRef!: MatDialogRef<TasksSettingsDialogComponent, ApiTask[] | undefined>;

  constructor(
    private dialog: MatDialog,
  ) {
  }

  public openDialog(currentTasks: Task[]): Observable<ApiTask[] | undefined> {
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
