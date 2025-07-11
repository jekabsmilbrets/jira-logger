import { inject, Injectable } from '@angular/core';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { BehaviorSubject, catchError, filter, interval, map, Observable, of, switchMap, take, tap, withLatestFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskManagerService {
  public activeTask$: Observable<Task | null>;
  public timeLoggedToday$: Observable<number>;

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  private activeTaskSubject: BehaviorSubject<Task | null> = new BehaviorSubject<Task | null>(null);
  private timeLoggedTodaySubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  constructor() {
    this.activeTask$ = this.activeTaskSubject.asObservable();
    this.timeLoggedToday$ = this.timeLoggedTodaySubject.asObservable();

    this.calculateTimeLoggedToday().subscribe();

    this.listenActiveTaskStart().subscribe();

    this.listenActiveTaskFinish().subscribe();

    this.getActiveTaskFromTasksList().subscribe();
  }

  private calculateTimeLoggedToday(): Observable<number> {
    const date: Date = new Date();

    date.setHours(0, 0, 0, 0);

    const getTimeLoggedToday: () => Observable<number> = () => this.tasksService.filteredList({
      date,
    })
      .pipe(
        catchError(() => of([])),
        map(
          (tasks: Task[]) => tasks.map(
            (task: Task) => task.calcTimeLoggedForDate(date))
            .reduce(
              (acc: number, value: number) => acc + value, 0,
            ),
        ),
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
        switchMap((currentTask: Task | undefined): Observable<void> => {
          if (currentTask) {
            this.activeTaskSubject.next(currentTask);
          }

          return of(undefined);
        }),
        catchError(() => of(null)),
      );
  }

  private listenActiveTaskFinish(): Observable<[Task, Task | null]> {
    return this.timeLogsService.taskFinished$
      .pipe(
        withLatestFrom(this.activeTask$),
        tap(([finishedTask, activeTask]: [Task, Task | null]) => {
          if (activeTask && activeTask.id === finishedTask.id) {
            this.activeTaskSubject.next(null);
          }
        }),
      );
  }

  private getActiveTaskFromTasksList(): Observable<Task | undefined> {
    return this.tasksService.tasks$
      .pipe(
        filter((tasks: Task[]) => tasks && tasks.length > 0),
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
