import { computed, inject, Service, Signal, signal, WritableSignal } from '@angular/core';

import { catchError, interval, map, Observable, of, switchMap, take, tap } from 'rxjs';

import { TimezoneService } from '@core/services/timezone.service';
import { toWallClockDateInTimezone } from '@core/utilities/timezone-date.utility';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

@Service()
export class TaskManagerService {
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);

  private readonly timeLoggedTodaySignal: WritableSignal<number> = signal<number>(0);

  public readonly activeTask: Signal<Task | null> = computed(() => this.tasksService.tasks()
    .find((task: Task) => task.isTimeLogRunning) ?? null);
  public readonly timeLoggedToday: Signal<number> = this.timeLoggedTodaySignal.asReadonly();

  constructor() {
    this.calculateTimeLoggedToday().subscribe();
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
}
