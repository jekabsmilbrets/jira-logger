import { HttpErrorResponse } from '@angular/common/http';
import type { Signal } from '@angular/core';

import { EMPTY, type Observable, of, take, catchError, finalize, map } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import type { TimeLogModalResponse } from '@tasks/interfaces/time-log-modal-response.interface';
import type { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';
import type { TimeLogPersistenceAdapter } from '@tasks/interfaces/time-log-persistence-adapter.interface';
import type { TimeLogEditService } from '@tasks/services/time-log-edit.service';
import { TimeLogEditTransaction } from '@tasks/services/time-log-edit-transaction';

export interface TimeLogEditSessionSaveResult {
  close: boolean;
  message?: string;
  response?: TimeLogsModalResponse;
}

export class TimeLogEditSession {
  private readonly transaction: TimeLogEditTransaction;
  private isSaving = false;

  public readonly timeLogs: Signal<TimeLog[]>;

  public constructor(
    initialTimeLogs: TimeLog[],
  ) {
    this.transaction = new TimeLogEditTransaction(initialTimeLogs);
    this.timeLogs = this.transaction.timeLogs;
  }

  public edit(
    timeLog: TimeLog,
    editService: TimeLogEditService,
  ): void {
    editService
      .openTimeLogDialog(timeLog)
      .pipe(take(1))
      .subscribe((response: TimeLogModalResponse | undefined) => this.applyDialogResponse(response, timeLog));
  }

  public add(
    editService: TimeLogEditService,
  ): void {
    const timeLog: TimeLog = new TimeLog({
      startTime: new Date(),
      endTime: new Date(),
    });

    editService
      .openTimeLogDialog(timeLog)
      .pipe(take(1))
      .subscribe((response: TimeLogModalResponse | undefined) => this.applyDialogResponse(response));
  }

  public remove(
    timeLog: TimeLog,
  ): void {
    this.transaction.remove(timeLog);
  }

  public save(
    task: Task,
    timeLogsAdapter: TimeLogPersistenceAdapter,
  ): Observable<TimeLogEditSessionSaveResult> {
    if (this.isSaving) {
      return EMPTY;
    }

    if (!this.transaction.hasChanges()) {
      return of({ close: true });
    }

    this.isSaving = true;

    return this.transaction.save(task, timeLogsAdapter)
      .pipe(
        map((timeLogs: TimeLog[]) => ({
          close: true,
          message: 'Time logs updated.',
          response: {
            saved: true,
            timeLogs: [...timeLogs],
          },
        })),
        catchError((error: HttpErrorResponse) => of({
          close: false,
          message: this.buildSaveErrorMessage(error),
        })),
        finalize(() => {
          this.isSaving = false;
        }),
      );
  }

  private applyDialogResponse(
    response: TimeLogModalResponse | undefined,
    sourceTimeLog?: TimeLog,
  ): void {
    if (response?.responseType === 'update' && response.responseData) {
      if (sourceTimeLog) {
        this.transaction.update(sourceTimeLog, response.responseData);
        return;
      }

      this.transaction.create(response.responseData);
    }

    if (response?.responseType === 'delete' && sourceTimeLog) {
      this.transaction.remove(sourceTimeLog);
    }
  }

  private buildSaveErrorMessage(
    error: HttpErrorResponse,
  ): string {
    const errors: string = Array.isArray(error.error?.errors) ? error.error.errors.join(', ') : '';

    return errors ? `Time logs update failed! ${ errors }` : 'Time logs update failed!';
  }
}
