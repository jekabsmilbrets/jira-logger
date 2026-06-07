import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';
import { TableComponent } from '@shared/components/table/table.component';

import { Column } from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';
import { TimeLog } from '@shared/models/time-log.model';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { createTimeLogListColumns } from '@tasks/constants/time-log-list-columns.constant';
import { TimeLogListDialogDataInterface } from '@tasks/interfaces/time-log-list-dialog-data.interface';
import { TimeLogModalResponseInterface } from '@tasks/interfaces/time-log-modal-response.interface';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { concatMap, from, Observable, switchMap, take, tap, toArray } from 'rxjs';

interface SaveOperation {
  request$: Observable<TimeLog | void>;
  onSuccess: (result: TimeLog | void) => void;
}

@Component({
  selector: 'tasks-time-log-list-modal',
  templateUrl: './time-log-list-modal.component.html',
  styleUrls: ['./time-log-list-modal.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatToolbarModule,
    TableComponent,
  ],
})
export class TimeLogListModalComponent {
  protected data: TimeLogListDialogDataInterface = inject<TimeLogListDialogDataInterface>(MAT_DIALOG_DATA);

  protected columns: Column[];

  private readonly timeLogEditService: TimeLogEditService = inject(TimeLogEditService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);

  private dialogRef: MatDialogRef<TimeLogListModalComponent, undefined | TimeLogsModalResponseInterface> = inject<MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface | undefined>>(MatDialogRef);

  private createdTimeLogs: TimeLog[] = [];
  private updatedTimeLogs: TimeLog[] = [];
  private deletedTimeLogs: TimeLog[] = [];
  private isSaving: boolean = false;

  constructor() {
    this.columns = createTimeLogListColumns(
      () => this.localeService.locale,
      () => this.timezoneService.timezone,
    );
  }

  protected get timeLogs(): TimeLog[] {
    return this.data.task.timeLogs;
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onSave(): void {
    if (this.isSaving) {
      return;
    }

    const operations = this.buildSaveOperations();
    if (operations.length === 0) {
      this.dialogRef.close();

      return;
    }

    this.isSaving = true;

    from(operations)
      .pipe(
        concatMap((operation: SaveOperation) => operation.request$.pipe(
          tap((result: TimeLog | void) => operation.onSuccess(result)),
        )),
        toArray(),
        switchMap(() => this.timeLogsService.list(this.data.task)),
        take(1),
      )
      .subscribe({
        next: (timeLogs: TimeLog[]) => {
          this.data.task.timeLogs = [...timeLogs];
          this.resetTrackedChanges();
          this.isSaving = false;
          this.openSnackBar('Time logs updated.');
          this.dialogRef.close({ saved: true });
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving = false;
          this.openSnackBar(this.buildSaveErrorMessage(error));
        },
      });
  }

  protected onCellClick(
    [timeLog]: [Searchable, Column],
  ): void {
    this.timeLogEditService
      .openTimeLogDialog(timeLog as TimeLog)
      .pipe(take(1))
      .subscribe((response: TimeLogModalResponseInterface | undefined) => {
        if (response) {
          switch (response.responseType) {
            case 'cancel':
              break;
            case 'update':
              if (response.responseData) {
                this.onUpdateAction(timeLog as TimeLog, response.responseData);
              }
              break;
            case 'delete':
              this.onRemoveAction(timeLog as TimeLog);
              break;
          }
        }
      });
  }

  protected onCreateAction(
    timeLog: TimeLog,
  ): void {
    this.createdTimeLogs.push(timeLog);
    this.data.task.timeLogs = [
      ...this.data.task.timeLogs,
      timeLog,
    ];
  }

  protected onUpdateAction(
    sourceTimeLog: TimeLog,
    nextTimeLog: TimeLog,
  ): void {
    const indexOfTimeLog = this.findTimeLogIndex(sourceTimeLog);
    if (indexOfTimeLog < 0) {
      return;
    }

    const timeLogs: TimeLog[] = [...this.data.task.timeLogs];
    timeLogs.splice(indexOfTimeLog, 1, nextTimeLog);
    this.data.task.timeLogs = timeLogs;

    const createdTimeLogIndex = this.createdTimeLogs.findIndex(
      (createdTimeLog: TimeLog) => createdTimeLog === sourceTimeLog,
    );

    if (createdTimeLogIndex >= 0) {
      this.createdTimeLogs.splice(createdTimeLogIndex, 1, nextTimeLog);

      return;
    }

    this.upsertUpdatedTimeLog(nextTimeLog);
  }

  protected onRemoveAction(
    timeLog: Searchable,
  ): void {
    const timeLogModel: TimeLog = timeLog as TimeLog;
    const indexOfTimeLog = this.findTimeLogIndex(timeLogModel);
    if (indexOfTimeLog < 0) {
      return;
    }

    const timeLogs: TimeLog[] = [...this.data.task.timeLogs];
    timeLogs.splice(indexOfTimeLog, 1);
    this.data.task.timeLogs = timeLogs;

    const createdTimeLogIndex = this.createdTimeLogs.findIndex(
      (createdTimeLog: TimeLog) => createdTimeLog === timeLogModel,
    );

    if (createdTimeLogIndex >= 0) {
      this.createdTimeLogs.splice(createdTimeLogIndex, 1);

      return;
    }

    this.updatedTimeLogs = this.updatedTimeLogs.filter(
      (updatedTimeLog: TimeLog) => updatedTimeLog.id !== timeLogModel.id,
    );

    if (timeLogModel.id && !this.deletedTimeLogs.some((deletedTimeLog: TimeLog) => deletedTimeLog.id === timeLogModel.id)) {
      this.deletedTimeLogs.push(timeLogModel);
    }
  }

  protected onAddTimeLogClick(): void {
    const timeLog: TimeLog = new TimeLog({
      startTime: new Date(),
      endTime: new Date(),
    });

    this.timeLogEditService.openTimeLogDialog(timeLog)
      .pipe(take(1))
      .subscribe((response: TimeLogModalResponseInterface | undefined) => {
        if (response) {
          switch (response.responseType) {
            case 'cancel':
              break;
            case 'update':
              if (response.responseData) {
                this.onCreateAction(response.responseData);
              }
              break;
          }
        }
      });
  }

  private findTimeLogIndex(
    timeLog: TimeLog,
  ): number {
    return this.data.task.timeLogs.findIndex(
      (currentTimeLog: TimeLog) => currentTimeLog === timeLog ||
        (Boolean(currentTimeLog.id) && Boolean(timeLog.id) && currentTimeLog.id === timeLog.id),
    );
  }

  private upsertUpdatedTimeLog(
    timeLog: TimeLog,
  ): void {
    const existingIndex = this.updatedTimeLogs.findIndex(
      (updatedTimeLog: TimeLog) => updatedTimeLog.id === timeLog.id,
    );

    if (existingIndex >= 0) {
      this.updatedTimeLogs.splice(existingIndex, 1, timeLog);

      return;
    }

    this.updatedTimeLogs.push(timeLog);
  }

  private buildSaveOperations(): SaveOperation[] {
    return [
      ...this.createdTimeLogs.map((timeLog: TimeLog) => ({
        request$: this.timeLogsService.create(this.data.task, timeLog),
        onSuccess: (result: TimeLog | void) => {
          if (result instanceof TimeLog) {
            this.replaceTimeLog(timeLog, result);
          }

          this.createdTimeLogs = this.createdTimeLogs.filter(
            (createdTimeLog: TimeLog) => createdTimeLog !== timeLog,
          );
        },
      })),
      ...this.updatedTimeLogs.map((timeLog: TimeLog) => ({
        request$: this.timeLogsService.update(this.data.task, timeLog),
        onSuccess: (result: TimeLog | void) => {
          if (result instanceof TimeLog) {
            this.replaceTimeLog(timeLog, result);
          }

          this.updatedTimeLogs = this.updatedTimeLogs.filter(
            (updatedTimeLog: TimeLog) => updatedTimeLog.id !== timeLog.id,
          );
        },
      })),
      ...this.deletedTimeLogs.map((timeLog: TimeLog) => ({
        request$: this.timeLogsService.delete(this.data.task, timeLog),
        onSuccess: () => {
          this.deletedTimeLogs = this.deletedTimeLogs.filter(
            (deletedTimeLog: TimeLog) => deletedTimeLog.id !== timeLog.id,
          );
        },
      })),
    ];
  }

  private replaceTimeLog(
    sourceTimeLog: TimeLog,
    nextTimeLog: TimeLog,
  ): void {
    const timeLogIndex = this.findTimeLogIndex(sourceTimeLog);
    if (timeLogIndex < 0) {
      return;
    }

    const timeLogs = [...this.data.task.timeLogs];
    timeLogs.splice(timeLogIndex, 1, nextTimeLog);
    this.data.task.timeLogs = timeLogs;
  }

  private resetTrackedChanges(): void {
    this.createdTimeLogs = [];
    this.updatedTimeLogs = [];
    this.deletedTimeLogs = [];
  }

  private buildSaveErrorMessage(
    error: HttpErrorResponse,
  ): string {
    const errors = Array.isArray(error.error?.errors) ? error.error.errors.join(', ') : '';

    return errors ? `Time logs update failed! ${ errors }` : 'Time logs update failed!';
  }

  private openSnackBar(
    message: string,
    duration: number = 5000,
  ): void {
    this.matSnackBar.open(
      message,
      undefined,
      {
        duration,
      },
    );
  }
}
