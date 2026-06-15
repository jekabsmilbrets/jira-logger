import { effect, inject, Service, Signal, signal } from '@angular/core';

import { catchError, interval, map, Observable, of, switchMap, take, tap } from 'rxjs';

import { TimezoneService } from '@core/services/timezone.service';
import { toWallClockDateInTimezone } from '@core/utils/timezone-date.utility';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

@Service()
export class TaskManagerService {
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);

  private readonly activeTaskSignal = signal<Task | null>(null);
  private readonly timeLoggedTodaySignal = signal<number>(0);

  public get activeTask(): Signal<Task | null> {
    return this.activeTaskSignal.asReadonly();
  }

  public get timeLoggedToday(): Signal<number> {
    return this.timeLoggedTodaySignal.asReadonly();
  }

  constructor() {
    this.calculateTimeLoggedToday().subscribe();

    this.listenActiveTaskStart().subscribe();

    this.listenActiveTaskFinish().subscribe();
    this.syncActiveTaskFromTasks();
    this.registerActiveTaskSync();
  }

  private calculateTimeLoggedToday(): Observable<number> {
    const getTimeLoggedToday: () => Observable<number> = () => {
      const date: Date = this.getStartOfToday();

      return this.tasksService.filteredList({
        date,
      })
        .pipe(
          catchError(() => of([])),
          map(
            (tasks: Task[]) => tasks.map(
              (task: Task) => task.calcTimeLoggedForDate(date, this.timezoneService.timezone))
              .reduce(
                (acc: number, value: number) => acc + value, 0,
              ),
          ),
          tap((timeLoggedToday: number) => this.timeLoggedTodaySignal.set(timeLoggedToday)),
        );
    };

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

  private getStartOfToday(): Date {
    const date: Date = toWallClockDateInTimezone(new Date(), this.timezoneService.timezone);
    date.setHours(0, 0, 0, 0);

    return date;
  }

  private listenActiveTaskStart(): Observable<null | void> {
    return this.timeLogsService.taskStarted$
      .pipe(
        tap((currentTask: Task | undefined) => {
          if (currentTask) {
            this.activeTaskSignal.set(currentTask);
          }
        }),
        map(() => undefined),
        catchError(() => of(null)),
      );
  }

  private listenActiveTaskFinish(): Observable<Task> {
    return this.timeLogsService.taskFinished$
      .pipe(
        tap((finishedTask: Task) => {
          const activeTask: Task | null = this.activeTaskSignal();

          if (activeTask && activeTask.id === finishedTask.id) {
            this.activeTaskSignal.set(null);
          }
        }),
      );
  }

  private registerActiveTaskSync(): void {
    effect(() => {
      this.syncActiveTaskFromTasks();
    });
  }

  private syncActiveTaskFromTasks(): void {
    const activeTask: Task | undefined = this.tasksService.tasks()
      .find((task: Task) => task.isTimeLogRunning);

    this.activeTaskSignal.set(activeTask ?? null);
  }
}
