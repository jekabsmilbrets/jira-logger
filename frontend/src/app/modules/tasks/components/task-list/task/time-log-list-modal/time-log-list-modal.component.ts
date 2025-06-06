import { Component, Inject, ViewChild } from '@angular/core';
import { MatDatepicker } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Column } from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';
import { TimeLog } from '@shared/models/time-log.model';

import { columns as timeLogListColumns } from '@tasks/constants/time-log-list-columns.constant';
import { TimeLogListDialogDataInterface } from '@tasks/interfaces/time-log-list-dialog-data.interface';
import { TimeLogModalResponseInterface } from '@tasks/interfaces/time-log-modal-response.interface';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { take, throwError } from 'rxjs';

@Component(
  {
    selector: 'tasks-time-log-list-modal',
    templateUrl: './time-log-list-modal.component.html',
    styleUrls: ['./time-log-list-modal.component.scss'],
    standalone: false,
  },
)
export class TimeLogListModalComponent {
  public columns: Column[] = timeLogListColumns;

  @ViewChild('picker')
  public picker!: MatDatepicker<Date>;

  private createdTimeLogs: TimeLog[] = [];
  private updatedTimeLogs: TimeLog[] = [];
  private deletedTimeLogs: TimeLog[] = [];

  constructor(
    private timeLogEditService: TimeLogEditService,
    private dialogRef: MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: TimeLogListDialogDataInterface,
  ) {
  }

  public get timeLogs(): TimeLog[] {
    return this.data.task.timeLogs;
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSave(): void {
    const filterFinalTimeLogs = (timeLog: TimeLog) => this.timeLogs.find((timeLog2: TimeLog) => timeLog === timeLog2) instanceof TimeLog;

    this.dialogRef.close(
      {
        created: this.createdTimeLogs.filter(filterFinalTimeLogs),
        updated: this.updatedTimeLogs.filter(filterFinalTimeLogs),
        deleted: this.deletedTimeLogs,
      },
    );
  }

  public onCellClick([timeLog, column]: [Searchable, Column]): void {
    this.timeLogEditService.openTimeLogDialog(
      timeLog as TimeLog,
    )
      .pipe(take(1))
      .subscribe(
        (response: TimeLogModalResponseInterface | undefined) => {
          if (response) {
            switch (response.responseType) {
              case 'cancel':
                break;
              case 'update':
                if (response.responseData) {
                  this.onUpdateAction(response.responseData);
                }
                break;
              case 'delete':
                this.onRemoveAction(timeLog as TimeLog);
                break;
            }
          }
        },
      );
  }

  public onCreateAction(timeLog: TimeLog): void {
    this.createdTimeLogs.push(timeLog);

    const timeLogs = [...this.data.task.timeLogs];
    timeLogs.push(timeLog);

    this.data.task.timeLogs = timeLogs;
  }

  public onUpdateAction(timeLog: TimeLog): void {
    this.updatedTimeLogs.push(timeLog);

    const timeLogs = this.findTimeLogSpliceAndReturnTimeLogs(timeLog);

    timeLogs.push(timeLog);

    this.data.task.timeLogs = timeLogs;
  }

  public onRemoveAction(timeLog: Searchable): void {
    if (timeLog.id) {
      this.deletedTimeLogs.push(timeLog as TimeLog);
    }

    this.data.task.timeLogs = this.findTimeLogSpliceAndReturnTimeLogs(timeLog as TimeLog);
  }

  public onAddTimeLogClick(): void {
    const timeLog = new TimeLog(
      {
        startTime: new Date(),
        endTime: new Date(),
      },
    );

    this.timeLogEditService.openTimeLogDialog(
      timeLog,
    )
      .pipe(take(1))
      .subscribe(
        (response: TimeLogModalResponseInterface | undefined) => {
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
        },
      );
  }

  private findTimeLogSpliceAndReturnTimeLogs(timeLog: TimeLog) {
    const timeLogs = [...this.data.task.timeLogs];
    const timeLogUuid = timeLog.id;
    const indexOfTimeLog = this.data.task.timeLogs.findIndex(
      (t: TimeLog) => t.id === timeLog.id,
    );

    if (indexOfTimeLog < 0) {
      throwError(() => new Error(`Could not locate time log ${ timeLogUuid }`));
    }

    timeLogs.splice(indexOfTimeLog, 1);

    return timeLogs;
  }
}
