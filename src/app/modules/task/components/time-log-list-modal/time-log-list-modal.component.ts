import { Component, Inject, ViewChild }             from '@angular/core';
import { FormControl }                              from '@angular/forms';
import { MatDatepicker }                            from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';

import { take, switchMap, of, throwError } from 'rxjs';

import { Column }     from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';

import { TimeLogModalComponent } from '@task/components/time-log-list-modal/time-log-modal/time-log-modal.component';

import { columns as timeLogListColumns }  from '@task/constants/time-log-list-columns.constant';
import { TimeLogListDialogDataInterface } from '@task/interfaces/time-log-list-dialog-data.interface';
import { TimeLogModalResponseInterface }  from '@task/interfaces/time-log-modal-response.interface';
import { TimeLogsModalResponseInterface } from '@task/interfaces/time-logs-modal-response.interface';
import { TimeLog }                        from '@task/models/time-log.model';

@Component({
             selector: 'app-time-log-list-modal',
             templateUrl: './time-log-list-modal.component.html',
             styleUrls: ['./time-log-list-modal.component.scss'],
           })
export class TimeLogListModalComponent {
  public columns: Column[] = timeLogListColumns;

  public formControl = new FormControl<Date | null>(new Date());

  @ViewChild('picker')
  public picker!: MatDatepicker<Date>;

  private timeLogDialogRef!: MatDialogRef<TimeLogModalComponent, TimeLogModalResponseInterface | undefined>;

  constructor(
    private dialogRef: MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: TimeLogListDialogDataInterface,
    private dialog: MatDialog,
  ) {
  }

  public onCancel(): void {
    this.dialogRef.close(
      {
        responseType: 'cancel',
      },
    );
  }

  public onSave(): void {
    this.dialogRef.close(
      {
        responseType: 'update',
        responseData: this.data.task.timeLogs,
      },
    );
  }

  public onCellClick([timeLog, column]: [Searchable, Column]): void {
    this.timeLogDialogRef = this.dialog.open(
      TimeLogModalComponent,
      {
        data: {
          task: this.data.task,
          timeLog,
        },
      },
    );

    let oldTimeLog: TimeLog | undefined;

    this.timeLogDialogRef.afterClosed()
        .pipe(
          take(1),
          switchMap(
            (result: TimeLogModalResponseInterface | undefined) => {
              if (!result) {
                result = {
                  responseType: 'cancel',
                };
              }

              switch (result.responseType) {
                case 'cancel':
                  break;

                case 'delete':
                  if (!result.hasOwnProperty('responseData')) {
                    return throwError(() => new Error('Missing response data'));
                  }

                  oldTimeLog = result.responseData?.oldTimeLog;

                  if (oldTimeLog) {
                    this.removeTimeLog(oldTimeLog);

                    return of(true);
                  }
                  break;

                case 'update':
                  if (
                    !result.hasOwnProperty('responseData') ||
                    (
                      result.hasOwnProperty('responseData') && (
                        !result.responseData?.hasOwnProperty('oldTimeLog') ||
                        !result.responseData?.hasOwnProperty('updatedTimeLogData')
                      )
                    )
                  ) {
                    return throwError(() => new Error('Missing response data'));
                  }

                  oldTimeLog = result.responseData?.oldTimeLog;
                  const updatedTimeLogData = result.responseData?.updatedTimeLogData ?? {};

                  if (oldTimeLog) {

                    this.updateTimeLog(oldTimeLog, updatedTimeLogData);

                    return of(true);
                  }

                  break;
              }

              return of(false);
            },
          ),
        )
        .subscribe();
  }

  public onRemoveAction(timeLog: Searchable): void {
    this.removeTimeLog(timeLog as TimeLog);
  }

  public onAddTimeLogClick(): void {
    const timeLog = new TimeLog(
      {
        startTime: new Date(),
        endTime: new Date(),
      },
    );

    this.timeLogDialogRef = this.dialog.open(
      TimeLogModalComponent,
      {
        data: {
          task: this.data.task,
          timeLog,
        },
      },
    );

    this.timeLogDialogRef.afterClosed()
        .pipe(
          take(1),
          switchMap(
            (result: TimeLogModalResponseInterface | undefined) => {
              if (!result) {
                result = {
                  responseType: 'cancel',
                };
              }

              switch (result.responseType) {
                case 'cancel':
                  break;

                case 'update':
                  if (!result.hasOwnProperty('responseData')) {
                    return throwError(() => new Error('Missing response data'));
                  }

                  this.createTimeLog(result.responseData?.updatedTimeLogData);

                  return of(true);
              }

              return of(false);
            },
          ),
        )
        .subscribe();
  }

  private removeTimeLog(timeLog: TimeLog): void {
    const timeLogUuid = timeLog.uuid;
    const indexOfTimeLog = this.data.task.timeLogs.findIndex(
      (t: TimeLog) => t.uuid === timeLogUuid,
    );

    if (indexOfTimeLog < 0) {
      throwError(() => new Error(`Could not locate time log ${timeLogUuid}`));
    }

    const timeLogs = [...this.data.task.timeLogs];

    timeLogs.splice(indexOfTimeLog, 1);

    this.data.task.timeLogs = timeLogs;
  }

  private updateTimeLog(timeLog: TimeLog, newData: any): void {
    const timeLogUuid = timeLog.uuid;
    const timeLogToUpdate: TimeLog | undefined = this.data.task.timeLogs.find(
      (t: TimeLog) => t.uuid === timeLogUuid,
    );

    if (timeLogToUpdate && newData) {
      Object.assign(timeLogToUpdate, newData);
    }
  }

  private createTimeLog(newTimeLogData: any): void {
    const timeLog = new TimeLog(newTimeLogData);
    const timeLogs = [...this.data.task.timeLogs];

    timeLogs.push(timeLog);

    this.data.task.timeLogs = timeLogs;
  }
}
