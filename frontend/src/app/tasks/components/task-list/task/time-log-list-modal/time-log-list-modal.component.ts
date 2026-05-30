import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TableComponent } from '@shared/components/table/table.component';

import { Column } from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';
import { TimeLog } from '@shared/models/time-log.model';

import { columns as timeLogListColumns } from '@tasks/constants/time-log-list-columns.constant';
import { TimeLogListDialogDataInterface } from '@tasks/interfaces/time-log-list-dialog-data.interface';
import { TimeLogModalResponseInterface } from '@tasks/interfaces/time-log-modal-response.interface';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { take } from 'rxjs';

@Component({
  selector: 'tasks-time-log-list-modal',
  templateUrl: './time-log-list-modal.component.html',
  styleUrls: ['./time-log-list-modal.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    TableComponent,
  ],
})
export class TimeLogListModalComponent {
  protected data: TimeLogListDialogDataInterface = inject<TimeLogListDialogDataInterface>(MAT_DIALOG_DATA);

  protected columns: Column[] = timeLogListColumns;

  private readonly timeLogEditService: TimeLogEditService = inject(TimeLogEditService);

  private dialogRef: MatDialogRef<TimeLogListModalComponent, undefined | TimeLogsModalResponseInterface> = inject<MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface | undefined>>(MatDialogRef);

  private createdTimeLogs: TimeLog[] = [];
  private updatedTimeLogs: TimeLog[] = [];
  private deletedTimeLogs: TimeLog[] = [];

  protected get timeLogs(): TimeLog[] {
    return this.data.task.timeLogs;
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onSave(): void {
    const filterFinalTimeLogs: (timeLog: TimeLog) => boolean = (
      timeLog: TimeLog,
    ) => this.timeLogs.find(
      (timeLog2: TimeLog) => timeLog === timeLog2,
    ) instanceof TimeLog;

    this.dialogRef.close({
      created: this.createdTimeLogs.filter(filterFinalTimeLogs),
      updated: this.updatedTimeLogs.filter(filterFinalTimeLogs),
      deleted: this.deletedTimeLogs,
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
                this.onUpdateAction(response.responseData);
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

    const timeLogs: TimeLog[] = [...this.data.task.timeLogs];
    timeLogs.push(timeLog);

    this.data.task.timeLogs = timeLogs;
  }

  protected onUpdateAction(
    timeLog: TimeLog,
  ): void {
    const timeLogs: TimeLog[] | null = this.findTimeLogSpliceAndReturnTimeLogs(timeLog);
    if (!timeLogs) {
      return;
    }

    timeLogs.push(timeLog);
    this.updatedTimeLogs.push(timeLog);
    this.data.task.timeLogs = timeLogs;
  }

  protected onRemoveAction(
    timeLog: Searchable,
  ): void {
    const timeLogs: TimeLog[] | null = this.findTimeLogSpliceAndReturnTimeLogs(timeLog as TimeLog);
    if (!timeLogs) {
      return;
    }

    if (timeLog.id) {
      this.deletedTimeLogs.push(timeLog as TimeLog);
    }
    this.data.task.timeLogs = timeLogs;
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

  private findTimeLogSpliceAndReturnTimeLogs(
    timeLog: TimeLog,
  ): TimeLog[] | null {
    const timeLogs: TimeLog[] = [...this.data.task.timeLogs];
    const indexOfTimeLog: number = this.data.task.timeLogs.findIndex(
      (t: TimeLog) => t.id === timeLog.id,
    );

    if (indexOfTimeLog < 0) {
      return null;
    }

    timeLogs.splice(indexOfTimeLog, 1);

    return timeLogs;
  }
}
