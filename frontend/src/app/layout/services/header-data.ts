import { computed, DestroyRef, inject, type ResourceRef, Service, type Signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { merge, type Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

import type { JsonApi } from '@core/interfaces/json-api.interface';

import { adaptTask } from '@shared/adapters/task.adapter';
import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { Task } from '@shared/models/task.model';
import { ApiRequest } from '@shared/services/api-request';
import { TimeLogs } from '@shared/services/time-logs';

interface TodaySecondsResponse {
  totalSeconds: number;
}

@Service()
export class HeaderData {
  private readonly apiRequestService: ApiRequest = inject(ApiRequest);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly timeLogsService: TimeLogs = inject(TimeLogs);
  private readonly taskResource: ResourceRequestHandle = this.apiRequestService.resource('task');

  private readonly activeTaskResource: ResourceRef<Task | null> = rxResource({
    stream: () => this.taskResource.dataRequest<ApiTask | null>(
      '/active',
      'get',
      null,
      (error: unknown) => this.processActiveTaskError(error),
    )
      .pipe(
        map((task: ApiTask | null): Task | null => task ? adaptTask(task) : null),
      ),
    defaultValue: null,
  });

  private readonly todaySecondsResource: ResourceRef<number> = rxResource({
    stream: () => this.taskResource.dataRequest<TodaySecondsResponse>('/today/seconds')
      .pipe(
        map((response: TodaySecondsResponse): number => response.totalSeconds),
      ),
    defaultValue: 0,
  });

  public readonly activeTask: Signal<Task | null> = computed(() => this.activeTaskResource.value());
  public readonly timeLoggedToday: Signal<number> = computed(() => this.todaySecondsResource.value());

  constructor() {
    merge(
      this.timeLogsService.taskStarted$,
      this.timeLogsService.taskFinished$,
      this.timeLogsService.timeLogChanged$,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadActiveTask());

    const intervalId: ReturnType<typeof setInterval> = setInterval(
      () => this.reloadTimeLoggedToday(),
      10_000,
    );

    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  public reloadActiveTask(): boolean {
    return this.activeTaskResource.reload();
  }

  public reloadTimeLoggedToday(): boolean {
    return this.todaySecondsResource.reload();
  }

  private processActiveTaskError(error: unknown): Observable<JsonApi<ApiTask | null>> {
    if (this.isNotFoundError(error)) {
      return of({ data: null });
    }

    return throwError(() => error);
  }

  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'status' in error
      && error.status === 404;
  }
}
