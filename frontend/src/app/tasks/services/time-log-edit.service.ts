import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogListModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-list-modal.component';

import { TimeLogModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal.component';
import { TimeLogModalResponseInterface } from '@tasks/interfaces/time-log-modal-response.interface';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TimeLogEditService {
  private readonly matDialog: MatDialog = inject(MatDialog);

  public openTimeLogsListDialog(
    task: Task,
  ): Observable<TimeLogsModalResponseInterface | undefined> {
    const timeLogsListDialogRef: MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface> = this.matDialog.open(
      TimeLogListModalComponent,
      {
        data: {
          task,
        },
      },
    );

    return timeLogsListDialogRef.afterClosed();
  }

  public openTimeLogDialog(
    timeLog: TimeLog,
  ): Observable<TimeLogModalResponseInterface | undefined> {
    const timeLogDialogRef: MatDialogRef<TimeLogModalComponent, TimeLogModalResponseInterface> = this.matDialog.open(
      TimeLogModalComponent,
      {
        data: {
          timeLog,
        },
      },
    );

    return timeLogDialogRef.afterClosed();
  }
}
