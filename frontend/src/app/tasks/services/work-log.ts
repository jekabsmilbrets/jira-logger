import { inject, Service } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { Tasks } from '@shared/services/tasks';
import { TimeLogs } from '@shared/services/time-logs';

export interface WorkLogInterruptionResult<T> {
  result: T;
  continued: boolean;
}

@Service()
export class WorkLog {
  private readonly tasksService: Tasks = inject(Tasks);
  private readonly timeLogsService: TimeLogs = inject(TimeLogs);

  public toggleTaskWorkLog(
    task: Task,
  ): Observable<Task[]> {
    return this.runWorkLogToggle(task)
      .pipe(
        switchMap(() => this.tasksService.list().pipe(take(1))),
      );
  }

  public runWithWorkLogInterruption<T>(
    task: Task,
    work$: Observable<T>,
  ): Observable<WorkLogInterruptionResult<T>> {
    if (!task.isTimeLogRunning) {
      return work$.pipe(
        map((result: T) => ({ result, continued: true })),
      );
    }

    return this.timeLogsService.stop(task)
      .pipe(
        switchMap(() => work$),
        switchMap((result: T) => this.timeLogsService.start(task)
          .pipe(
            map(() => ({ result, continued: true })),
            catchError(() => of({ result, continued: false })),
          )),
      );
  }

  private runWorkLogToggle(
    task: Task,
  ): Observable<unknown> {
    if (!task.isTimeLogRunning) {
      return this.timeLogsService.start(task);
    }

    return task.lastTimeLog instanceof TimeLog ?
      this.timeLogsService.stop(task) :
      of(undefined);
  }
}
