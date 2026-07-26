import { inject, Service } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogModal } from '@tasks/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal';
import type { TimeLogModalResponse } from '@tasks/interfaces/time-log-modal-response.interface';

@Service()
export class TimeLogEdit {
  private readonly matDialog: MatDialog = inject(MatDialog);

  public openTimeLogDialog(
    timeLog: TimeLog,
  ): Observable<TimeLogModalResponse | undefined> {
    const timeLogDialogRef: MatDialogRef<TimeLogModal, TimeLogModalResponse> = this.matDialog.open(
      TimeLogModal,
      {
        data: {
          timeLog,
        },
      },
    );

    return timeLogDialogRef.afterClosed();
  }
}
