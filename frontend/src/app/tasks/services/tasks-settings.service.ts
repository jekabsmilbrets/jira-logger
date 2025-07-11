import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Task } from '@shared/models/task.model';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TasksSettingsService {
  private readonly matDialog: MatDialog = inject(MatDialog);

  private dialogRef!: MatDialogRef<TasksSettingsDialogComponent, ApiTask[] | undefined>;

  public openDialog(
    currentTasks: Task[],
  ): Observable<ApiTask[] | undefined> {
    this.dialogRef = this.matDialog.open(
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
