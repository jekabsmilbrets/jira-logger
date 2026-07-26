import { inject, Service } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { Task } from '@shared/models/task.model';

import { TimeLogListModal } from '@tasks/components/task-list/task/time-log-list-modal/time-log-list-modal';
import type { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';

@Service()
export class TimeLogList {
  private readonly matDialog: MatDialog = inject(MatDialog);

  public openTimeLogsListDialog(
    task: Task,
  ): Observable<TimeLogsModalResponse | undefined> {
    const timeLogsListDialogRef: MatDialogRef<TimeLogListModal, TimeLogsModalResponse> = this.matDialog.open(
      TimeLogListModal,
      {
        data: {
          task: this.cloneTask(task),
        },
      },
    );

    return timeLogsListDialogRef.afterClosed();
  }

  private cloneTask(
    task: Task,
  ): Task {
    return new Task({
      id: task.id,
      name: task.name,
      description: task.description,
      lastTimeLog: task.lastTimeLog,
      timeLogs: task.timeLogs,
      jiraWorkLogs: task.jiraWorkLogs,
      timeLogged: task.timeLogged,
      tags: task.tags,
    });
  }
}
