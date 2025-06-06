import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogListModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-list-modal.component';
// eslint-disable-next-line max-len
import { TimeLogModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal.component';
import { TimeLogModalResponseInterface } from '@tasks/interfaces/time-log-modal-response.interface';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';

import { Observable } from 'rxjs';

@Injectable()
export class TimeLogEditService {
  constructor(
    private dialog: MatDialog,
  ) {
  }

  public openTimeLogsListDialog(
    task: Task,
  ): Observable<TimeLogsModalResponseInterface | undefined> {
    const timeLogsListDialogRef = this.dialog.open(
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
    const timeLogDialogRef = this.dialog.open(
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
