import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, injectAsync, type Signal, signal, type WritableSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

import { concatMap, from, switchMap, take, tap, toArray } from 'rxjs';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import { TimeLog } from '@shared/models/time-log.model';
import { TimeLogsService } from '@shared/services/time-logs.service';
import type { AsyncLoader } from '@shared/types/async-loader.type';

import { createTimeLogListColumns } from '@tasks/constants/time-log-list-columns.constant';
import type { SaveOperation } from '@tasks/interfaces/save-operation.interface';
import type { TimeLogListDialogData } from '@tasks/interfaces/time-log-list-dialog-data.interface';
import type { TimeLogModalResponse } from '@tasks/interfaces/time-log-modal-response.interface';
import type { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';
import type { TimeLogEditService } from '@tasks/services/time-log-edit.service';

@Component({
  selector: 'tasks-time-log-list-modal',
  templateUrl: './time-log-list-modal.component.html',
  styleUrls: ['./time-log-list-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  protected readonly data: TimeLogListDialogData = inject<TimeLogListDialogData>(MAT_DIALOG_DATA);

  protected columns: Column[];

  private readonly loadTimeLogEditService: AsyncLoader<TimeLogEditService> = injectAsync(
    () => import('@tasks/services/time-log-edit.service').then((m) => m.TimeLogEditService),
  );
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly dialogRef: MatDialogRef<TimeLogListModalComponent, undefined | TimeLogsModalResponse> = inject<MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponse | undefined>>(MatDialogRef);
  private readonly timeLogsState: WritableSignal<TimeLog[]> = signal([...this.data.task.timeLogs]);

  protected readonly timeLogs: Signal<TimeLog[]> = computed(() => this.timeLogsState());

  private readonly createdTimeLogs: WritableSignal<TimeLog[]> = signal([]);
  private readonly updatedTimeLogs: WritableSignal<TimeLog[]> = signal([]);
  private readonly deletedTimeLogs: WritableSignal<TimeLog[]> = signal([]);
  private readonly isSaving: WritableSignal<boolean> = signal(false);

  constructor() {
    this.columns = createTimeLogListColumns(
      () => this.localeService.locale,
      () => this.timezoneService.timezone,
    );
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onSave(): void {
    if (this.isSaving()) {
      return;
    }

    const operations: SaveOperation[] = this.buildSaveOperations();
    if (operations.length === 0) {
      this.dialogRef.close();

      return;
    }

    this.isSaving.set(true);

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
          const nextTimeLogs: TimeLog[] = [...timeLogs];

          this.timeLogsState.set(nextTimeLogs);
          this.resetTrackedChanges();
          this.isSaving.set(false);
          this.openSnackBar('Time logs updated.');
          this.dialogRef.close({
            saved: true,
            timeLogs: nextTimeLogs,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.openSnackBar(this.buildSaveErrorMessage(error));
        },
      });
  }

  protected async onCellClick(
    [timeLog]: [Searchable, Column],
  ): Promise<void> {
    const timeLogEditService: TimeLogEditService = await this.loadTimeLogEditService();

    timeLogEditService
      .openTimeLogDialog(timeLog as TimeLog)
      .pipe(take(1))
      .subscribe((response: TimeLogModalResponse | undefined) => this.handleTimeLogDialogResponse(response, timeLog as TimeLog));
  }

  protected onCreateAction(
    timeLog: TimeLog,
  ): void {
    this.createdTimeLogs.update((createdTimeLogs: TimeLog[]) => [
      ...createdTimeLogs,
      timeLog,
    ]);
    this.timeLogsState.update((timeLogs: TimeLog[]) => [
      ...timeLogs,
      timeLog,
    ]);
  }

  protected onUpdateAction(
    sourceTimeLog: TimeLog,
    nextTimeLog: TimeLog,
  ): void {
    const indexOfTimeLog: number = this.findTimeLogIndex(sourceTimeLog);
    if (indexOfTimeLog < 0) {
      return;
    }

    const timeLogs: TimeLog[] = [...this.timeLogsState()];
    timeLogs.splice(indexOfTimeLog, 1, nextTimeLog);
    this.timeLogsState.set(timeLogs);

    const createdTimeLogs: TimeLog[] = this.createdTimeLogs();
    const createdTimeLogIndex: number = createdTimeLogs.findIndex(
      (createdTimeLog: TimeLog) => createdTimeLog === sourceTimeLog,
    );

    if (createdTimeLogIndex >= 0) {
      this.createdTimeLogs.update((currentCreatedTimeLogs: TimeLog[]) => {
        const nextCreatedTimeLogs: TimeLog[] = [...currentCreatedTimeLogs];
        nextCreatedTimeLogs.splice(createdTimeLogIndex, 1, nextTimeLog);

        return nextCreatedTimeLogs;
      });

      return;
    }

    this.upsertUpdatedTimeLog(nextTimeLog);
  }

  protected onRemoveAction(
    timeLog: Searchable,
  ): void {
    const timeLogModel: TimeLog = timeLog as TimeLog;
    const indexOfTimeLog: number = this.findTimeLogIndex(timeLogModel);
    if (indexOfTimeLog < 0) {
      return;
    }

    const timeLogs: TimeLog[] = [...this.timeLogsState()];
    timeLogs.splice(indexOfTimeLog, 1);
    this.timeLogsState.set(timeLogs);

    const createdTimeLogs: TimeLog[] = this.createdTimeLogs();
    const createdTimeLogIndex: number = createdTimeLogs.findIndex(
      (createdTimeLog: TimeLog) => createdTimeLog === timeLogModel,
    );

    if (createdTimeLogIndex >= 0) {
      this.createdTimeLogs.update((currentCreatedTimeLogs: TimeLog[]) => {
        const nextCreatedTimeLogs: TimeLog[] = [...currentCreatedTimeLogs];
        nextCreatedTimeLogs.splice(createdTimeLogIndex, 1);

        return nextCreatedTimeLogs;
      });

      return;
    }

    this.updatedTimeLogs.set(this.updatedTimeLogs().filter(
      (updatedTimeLog: TimeLog) => updatedTimeLog.id !== timeLogModel.id,
    ));

    if (timeLogModel.id && !this.deletedTimeLogs().some((deletedTimeLog: TimeLog) => deletedTimeLog.id === timeLogModel.id)) {
      this.deletedTimeLogs.update((deletedTimeLogs: TimeLog[]) => [
        ...deletedTimeLogs,
        timeLogModel,
      ]);
    }
  }

  protected async onAddTimeLogClick(): Promise<void> {
    const timeLogEditService: TimeLogEditService = await this.loadTimeLogEditService();
    const timeLog: TimeLog = new TimeLog({
      startTime: new Date(),
      endTime: new Date(),
    });

    timeLogEditService.openTimeLogDialog(timeLog)
      .pipe(take(1))
      .subscribe((response: TimeLogModalResponse | undefined) => this.handleTimeLogDialogResponse(response));
  }

  private handleTimeLogDialogResponse(
    response: TimeLogModalResponse | undefined,
    timeLog?: TimeLog,
  ): void {
    if (!response) {
      return;
    }

    switch (response.responseType) {
      case 'cancel':
        break;
      case 'update':
        if (response.responseData) {
          if (timeLog) {
            this.onUpdateAction(timeLog, response.responseData);
          } else {
            this.onCreateAction(response.responseData);
          }
        }
        break;
      case 'delete':
        if (timeLog) {
          this.onRemoveAction(timeLog);
        }
        break;
    }
  }

  private findTimeLogIndex(
    timeLog: TimeLog,
  ): number {
    return this.timeLogsState().findIndex(
      (currentTimeLog: TimeLog) => currentTimeLog === timeLog ||
        (Boolean(currentTimeLog.id) && Boolean(timeLog.id) && currentTimeLog.id === timeLog.id),
    );
  }

  private upsertUpdatedTimeLog(
    timeLog: TimeLog,
  ): void {
    const existingIndex: number = this.updatedTimeLogs().findIndex(
      (updatedTimeLog: TimeLog) => updatedTimeLog.id === timeLog.id,
    );

    if (existingIndex >= 0) {
      this.updatedTimeLogs.update((updatedTimeLogs: TimeLog[]) => {
        const nextUpdatedTimeLogs: TimeLog[] = [...updatedTimeLogs];
        nextUpdatedTimeLogs.splice(existingIndex, 1, timeLog);

        return nextUpdatedTimeLogs;
      });

      return;
    }

    this.updatedTimeLogs.update((updatedTimeLogs: TimeLog[]) => [
      ...updatedTimeLogs,
      timeLog,
    ]);
  }

  private buildSaveOperations(): SaveOperation[] {
    return [
      ...this.createdTimeLogs().map((timeLog: TimeLog) => ({
        request$: this.timeLogsService.create(this.data.task, timeLog),
        onSuccess: (result: TimeLog | void) => {
          if (result instanceof TimeLog) {
            this.replaceTimeLog(timeLog, result);
          }

          this.createdTimeLogs.set(this.createdTimeLogs().filter(
            (createdTimeLog: TimeLog) => createdTimeLog !== timeLog,
          ));
        },
      })),
      ...this.updatedTimeLogs().map((timeLog: TimeLog) => ({
        request$: this.timeLogsService.update(this.data.task, timeLog),
        onSuccess: (result: TimeLog | void) => {
          if (result instanceof TimeLog) {
            this.replaceTimeLog(timeLog, result);
          }

          this.updatedTimeLogs.set(this.updatedTimeLogs().filter(
            (updatedTimeLog: TimeLog) => updatedTimeLog.id !== timeLog.id,
          ));
        },
      })),
      ...this.deletedTimeLogs().map((timeLog: TimeLog) => ({
        request$: this.timeLogsService.delete(this.data.task, timeLog),
        onSuccess: () => {
          this.deletedTimeLogs.set(this.deletedTimeLogs().filter(
            (deletedTimeLog: TimeLog) => deletedTimeLog.id !== timeLog.id,
          ));
        },
      })),
    ];
  }

  private replaceTimeLog(
    sourceTimeLog: TimeLog,
    nextTimeLog: TimeLog,
  ): void {
    const timeLogIndex: number = this.findTimeLogIndex(sourceTimeLog);
    if (timeLogIndex < 0) {
      return;
    }

    const timeLogs: TimeLog[] = [...this.timeLogsState()];
    timeLogs.splice(timeLogIndex, 1, nextTimeLog);
    this.timeLogsState.set(timeLogs);
  }

  private resetTrackedChanges(): void {
    this.createdTimeLogs.set([]);
    this.updatedTimeLogs.set([]);
    this.deletedTimeLogs.set([]);
  }

  private buildSaveErrorMessage(
    error: HttpErrorResponse,
  ): string {
    const errors: string = Array.isArray(error.error?.errors) ? error.error.errors.join(', ') : '';

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
