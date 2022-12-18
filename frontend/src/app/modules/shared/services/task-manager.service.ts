import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  catchError,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  pairwise,
  startWith,
  switchMap,
  withLatestFrom,
} from 'rxjs';

import { Task } from '@shared/models/task.model';

import { TasksService }    from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';


@Injectable({
  providedIn: 'root',
})
export class TaskManagerService {
  public activeTask$: Observable<Task>;

  private activeTaskSubject: BehaviorSubject<Task | undefined> = new BehaviorSubject<Task | undefined>(undefined);

  constructor(
    private tasksService: TasksService,
    private timeLogsService: TimeLogsService,
  ) {
    this.activeTask$ = this.activeTaskSubject.asObservable()
      .pipe(
        filter((activeTask: Task | undefined) => activeTask instanceof Task),
        map((activeTask: Task | undefined): Task => activeTask as Task),
      );

    this.timeLogsService.taskStarted$
      .pipe(
        startWith(undefined),
        pairwise(),
        withLatestFrom(this.tasksService.tasks$),
        switchMap(
          ([[previousTask, currentTask], currentTasks]: [[Task | undefined, Task | undefined], Task[]]): Observable<void> => {
            if (
              currentTask &&
              currentTasks && currentTasks.length > 0
            ) {
              if (previousTask) {
                const currentTaskFresh = currentTasks.find((task: Task) => task.id === previousTask.id);

                if (currentTaskFresh && currentTaskFresh.isTimeLogRunning) {
                  return this.timeLogsService.stop(currentTaskFresh);
                }
              }
              const ghostRunningTasks = currentTasks.filter(
                (task: Task) => task.id !== currentTask.id && task.isTimeLogRunning,
              ) ?? [];

              if (ghostRunningTasks.length > 0) {
                return forkJoin(
                  ghostRunningTasks.map(
                    (task: Task) => this.timeLogsService.stop(task),
                  ),
                )
                  .pipe(
                    map(() => undefined),
                  );
              }
            }

            return of(undefined);
          },
        ),
        catchError(() => of(null)),
      )
      .subscribe();
  }
}
