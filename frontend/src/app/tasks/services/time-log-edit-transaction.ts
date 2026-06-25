import { computed, type Signal, signal, type WritableSignal } from '@angular/core';

import { concatMap, from, type Observable, of, switchMap, tap, toArray } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TimeLogsService } from '@shared/services/time-logs.service';

interface TimeLogSaveOperation {
  request$: Observable<TimeLog | void>;
  onSuccess: (result: TimeLog | void) => void;
}

export class TimeLogEditTransaction {
  private readonly timeLogsState: WritableSignal<TimeLog[]>;
  private readonly createdTimeLogs: WritableSignal<TimeLog[]> = signal([]);
  private readonly updatedTimeLogs: WritableSignal<TimeLog[]> = signal([]);
  private readonly deletedTimeLogs: WritableSignal<TimeLog[]> = signal([]);

  public readonly timeLogs: Signal<TimeLog[]>;

  public constructor(
    initialTimeLogs: TimeLog[],
  ) {
    this.timeLogsState = signal([...initialTimeLogs]);
    this.timeLogs = computed(() => this.timeLogsState());
  }

  public create(
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

  public update(
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

  public remove(
    timeLog: TimeLog,
  ): void {
    const indexOfTimeLog: number = this.findTimeLogIndex(timeLog);
    if (indexOfTimeLog < 0) {
      return;
    }

    const timeLogs: TimeLog[] = [...this.timeLogsState()];
    timeLogs.splice(indexOfTimeLog, 1);
    this.timeLogsState.set(timeLogs);

    if (this.removeCreatedTimeLog(timeLog)) {
      return;
    }

    this.removeUpdatedTimeLog(timeLog);

    if (!this.shouldTrackDeletedTimeLog(timeLog)) {
      return;
    }

    this.deletedTimeLogs.update((deletedTimeLogs: TimeLog[]) => [
      ...deletedTimeLogs,
      timeLog,
    ]);
  }

  public hasChanges(): boolean {
    return this.createdTimeLogs().length > 0 ||
      this.updatedTimeLogs().length > 0 ||
      this.deletedTimeLogs().length > 0;
  }

  public reset(
    timeLogs: TimeLog[],
  ): void {
    this.timeLogsState.set([...timeLogs]);
    this.resetTrackedChanges();
  }

  public save(
    task: Task,
    timeLogsService: TimeLogsService,
  ): Observable<TimeLog[]> {
    const operations: TimeLogSaveOperation[] = this.buildSaveOperations(task, timeLogsService);

    if (operations.length === 0) {
      return of(this.timeLogs());
    }

    return from(operations)
      .pipe(
        concatMap((operation: TimeLogSaveOperation) => operation.request$.pipe(
          tap((result: TimeLog | void) => operation.onSuccess(result)),
        )),
        toArray(),
        switchMap(() => timeLogsService.list(task)),
        tap((timeLogs: TimeLog[]) => {
          this.timeLogsState.set([...timeLogs]);
          this.resetTrackedChanges();
        }),
      );
  }

  private removeCreatedTimeLog(
    timeLog: TimeLog,
  ): boolean {
    const createdTimeLogIndex: number = this.createdTimeLogs().findIndex(
      (createdTimeLog: TimeLog) => createdTimeLog === timeLog,
    );

    if (createdTimeLogIndex < 0) {
      return false;
    }

    this.createdTimeLogs.update((currentCreatedTimeLogs: TimeLog[]) => {
      const nextCreatedTimeLogs: TimeLog[] = [...currentCreatedTimeLogs];
      nextCreatedTimeLogs.splice(createdTimeLogIndex, 1);

      return nextCreatedTimeLogs;
    });

    return true;
  }

  private removeUpdatedTimeLog(
    timeLog: TimeLog,
  ): void {
    this.updatedTimeLogs.set(this.updatedTimeLogs().filter(
      (updatedTimeLog: TimeLog) => updatedTimeLog.id !== timeLog.id,
    ));
  }

  private shouldTrackDeletedTimeLog(
    timeLog: TimeLog,
  ): boolean {
    return Boolean(timeLog.id) && !this.deletedTimeLogs().some(
      (deletedTimeLog: TimeLog) => deletedTimeLog.id === timeLog.id,
    );
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

  private buildSaveOperations(
    task: Task,
    timeLogsService: TimeLogsService,
  ): TimeLogSaveOperation[] {
    return [
      ...this.createdTimeLogs().map((timeLog: TimeLog) => ({
        request$: timeLogsService.create(task, timeLog),
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
        request$: timeLogsService.update(task, timeLog),
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
        request$: timeLogsService.delete(task, timeLog),
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
}
