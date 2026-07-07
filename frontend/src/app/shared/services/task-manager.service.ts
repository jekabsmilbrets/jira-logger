import { computed, inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, interval, map, Observable, of, switchMap, take, tap } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TaskQueryService } from '@shared/services/task-query.service';
import { TasksService } from '@shared/services/tasks.service';

import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

@Service()
export class TaskManagerService {
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly taskQueryService: TaskQueryService = inject(TaskQueryService);
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);

  private readonly timeLoggedTodaySignal: WritableSignal<number> = signal<number>(0);

  public readonly activeTask: Signal<Task | null> = computed(() => this.tasksService.allTasks()
    .find((task: Task) => task.isTimeLogRunning) ?? null);
  public readonly timeLoggedToday: Signal<number> = this.timeLoggedTodaySignal.asReadonly();

  constructor() {
    this.calculateTimeLoggedToday().subscribe();
  }

  private calculateTimeLoggedToday(): Observable<number> {
    const getTimeLoggedToday: () => Observable<number> = () => {
      const date: Date = this.reportDateCalendarService.todayReportDate();

      return this.taskQueryService.query({
        date,
      })
        .pipe(
          catchError(() => of([])),
          map(
            (tasks: Task[]) => tasks.map(
              (task: Task) => this.reportDateCalendarService.timeLoggedForReportDate(task, date))
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
}
