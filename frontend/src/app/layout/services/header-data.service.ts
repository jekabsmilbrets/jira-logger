import { computed, inject, resource, Service, type Signal } from '@angular/core';

import { catchError, firstValueFrom, interval, of, take } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TaskQueryService } from '@shared/services/task-query.service';

import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

@Service()
export class HeaderDataService {
  private readonly taskQueryService: TaskQueryService = inject(TaskQueryService);
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);
  private readonly headerResource = resource({
    loader: () => this.loadHeaderData(),
  });

  public readonly activeTask: Signal<Task | null> = computed(() => this.headerResource.hasValue() ? this.headerResource.value().activeTask : null);
  public readonly timeLoggedToday: Signal<number> = computed(() => this.headerResource.hasValue() ? this.headerResource.value().timeLoggedToday : 0);

  constructor() {
    this.headerResource.reload();

    interval(10000)
      .subscribe(() => this.headerResource.reload());
  }

  private async loadHeaderData(): Promise<HeaderData> {
    const date: Date = this.reportDateCalendarService.todayReportDate();
    const tasks: Task[] = await firstValueFrom(
      this.taskQueryService.query({
        date,
      })
        .pipe(
          take(1),
          catchError(() => of([])),
        ),
    );

    return {
      activeTask: tasks.find((task: Task) => task.isTimeLogRunning) ?? null,
      timeLoggedToday: tasks.map(
        (task: Task) => this.reportDateCalendarService.timeLoggedForReportDate(task, date))
        .reduce(
          (acc: number, value: number) => acc + value, 0,
        ),
    };
  }
}

interface HeaderData {
  activeTask: Task | null;
  timeLoggedToday: number;
}
