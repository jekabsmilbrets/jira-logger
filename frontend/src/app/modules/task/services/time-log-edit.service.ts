import { Injectable } from '@angular/core';
import { MatDialog }  from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { Task }    from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogListModalComponent }     from '@task/components/task-list/task/time-log-list-modal/time-log-list-modal.component';
import { TimeLogModalComponent }         from '@task/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal.component';
import { TimeLogModalResponseInterface } from '@task/interfaces/time-log-modal-response.interface';

import { TimeLogsModalResponseInterface } from '@task/interfaces/time-logs-modal-response.interface';



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
