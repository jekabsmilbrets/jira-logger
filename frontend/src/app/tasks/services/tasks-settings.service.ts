import { inject, Service } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { Task } from '@shared/models/task.model';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';
import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';

@Service()
export class TasksSettingsService {
  private readonly matDialog: MatDialog = inject(MatDialog);

  private dialogRef!: MatDialogRef<TasksSettingsDialogComponent, TaskImportRequest | undefined>;

  public openDialog(
    currentTasks: Task[],
  ): Observable<TaskImportRequest | undefined> {
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
