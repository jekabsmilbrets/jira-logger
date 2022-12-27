import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  catchError,
  interval,
  map,
  Observable,
  of,
  skip,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from 'rxjs';

import { Task }            from '@shared/models/task.model';
import { TasksService }    from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';


@Injectable({
  providedIn: 'root',
})
export class TaskManagerService {
  public activeTask$: Observable<Task | null>;
  public timeLoggedToday$: Observable<number>;

  private activeTaskSubject: BehaviorSubject<Task | null> = new BehaviorSubject<Task | null>(null);
  private timeLoggedTodaySubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  constructor(
    private tasksService: TasksService,
    private timeLogsService: TimeLogsService,
  ) {
    this.activeTask$ = this.activeTaskSubject.asObservable();
    this.timeLoggedToday$ = this.timeLoggedTodaySubject.asObservable();

    this.calculateTimeLoggedToday()
      .subscribe();

    this.listenActiveTaskStart()
      .subscribe();

    this.listenActiveTaskFinish()
      .subscribe();

    this.getActiveTaskFromTasksList()
      .subscribe();
  }

  private calculateTimeLoggedToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const getTimeLoggedToday = () => this.tasksService.filteredList({
      date,
    })
      .pipe(
        catchError(() => of([])),
        map((tasks: Task[]) =>
          tasks.map((task: Task) => task.calcTimeLoggedForDate(date))
            .reduce((acc: number, value: number) => acc + value, 0)),
        tap((timeLoggedToday: number) => this.timeLoggedTodaySubject.next(timeLoggedToday)),
      );

    return getTimeLoggedToday()
      .pipe(
        take(1),
        switchMap(() => interval(10000)
          .pipe(
            switchMap(() => getTimeLoggedToday()),
          ),
        ),
      );
  }

  private listenActiveTaskStart(): Observable<null | void> {
    return this.timeLogsService.taskStarted$
      .pipe(
        switchMap(
          (currentTask: Task | undefined): Observable<void> => {
            if (currentTask) {
              this.activeTaskSubject.next(currentTask);
            }

            return of(undefined);
          },
        ),
        catchError(() => of(null)),
      );
  }

  private listenActiveTaskFinish(): Observable<[Task, (Task | null)]> {
    return this.timeLogsService.taskFinished$
      .pipe(
        withLatestFrom(this.activeTask$),
        tap(
          ([finishedTask, activeTask]: [Task, Task | null]) => {
            if (activeTask && activeTask.id === finishedTask.id) {
              this.activeTaskSubject.next(null);
            }
          },
        ),
      );
  }

  private getActiveTaskFromTasksList(): Observable<Task | undefined> {
    return this.tasksService.tasks$
      .pipe(
        skip(1),
        take(1),
        map((tasks: Task[]) => tasks.find((task: Task) => task.isTimeLogRunning)),
        tap((task: Task | undefined) => {
          if (task) {
            this.activeTaskSubject.next(task);
          }
        }),
      );
  }
}
