import { inject, Service, type Signal } from '@angular/core';

import { map, type Observable, Subject, tap } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import type { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';
import type { LoadableInitializer } from '@shared/interfaces/loadable-initializer.interface';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import { toUnixMs } from '@shared/utilities/to-unix-ms.utility';

@Service()
export class TimeLogsService implements LoadableInitializer {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public taskStarted$: Observable<Task>;
  public taskFinished$: Observable<Task>;

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly timeLogResource: ResourceRequestHandle = this.apiRequestService.resource({
    resourcePath: 'task',
    suffix: '/time-log',
  });
  public readonly isLoading: Signal<boolean> = this.timeLogResource.isLoading;

  private taskStartedSubject: Subject<Task> = new Subject<Task>();
  private taskFinishedSubject: Subject<Task> = new Subject<Task>();

  constructor() {
    this.taskStarted$ = this.taskStartedSubject.asObservable();
    this.taskFinished$ = this.taskFinishedSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'TimeLogsService',
    );
  }

  public list(
    task: Task,
  ): Observable<TimeLog[]> {
    return this.timeLogResource.listRequest<ApiTimeLog>(this.buildTaskTimeLogSuffix(task))
      .pipe(
        map((timeLogs: ApiTimeLog[]): TimeLog[] => adaptTimeLogs(timeLogs)),
      );
  }

  public create(
    task: Task,
    timeLog: TimeLog,
  ): Observable<TimeLog> {
    return this.saveTimeLog(
      task,
      timeLog,
      this.buildTaskTimeLogSuffix(task),
      'post',
    );
  }

  public update(
    task: Task,
    timeLog: TimeLog,
  ): Observable<TimeLog> {
    return this.saveTimeLog(
      task,
      timeLog,
      this.buildTaskTimeLogSuffix(task, timeLog),
      'patch',
    );
  }

  public delete(
    task: Task,
    timeLog: TimeLog,
  ): Observable<void> {
    return this.timeLogResource.request<void>(
      this.buildTaskTimeLogSuffix(task, timeLog),
      'delete',
    );
  }

  public start(
    task: Task,
  ): Observable<void> {
    return this.timeLogResource.request<void>(
      this.buildTaskTimeLogSuffix(task, 'start'),
      'post',
    )
      .pipe(
        tap(() => this.taskStartedSubject.next(task)),
      );
  }

  public stop(
    task: Task,
  ): Observable<void> {
    return this.timeLogResource.request<void>(
      this.buildTaskTimeLogSuffix(task, 'stop'),
      'post',
    )
      .pipe(
        tap(() => this.taskFinishedSubject.next(task)),
      );
  }

  private saveTimeLog(
    task: Task,
    timeLog: TimeLog,
    url: string,
    method: 'post' | 'patch',
  ): Observable<TimeLog> {
    return this.timeLogResource.dataRequest<ApiTimeLog>(
      url,
      method,
      this.buildTimeLogRequestBody(task, timeLog),
    )
      .pipe(
        map((timeLog: ApiTimeLog): TimeLog => adaptTimeLog(timeLog)),
      );
  }

  private buildTimeLogRequestBody(
    task: Task,
    timeLog: TimeLog,
  ): ApiRequestBody {
    return {
      id: timeLog.id,
      startTime: timeLog.startTime && toUnixMs<string>(timeLog.startTime, 'string'),
      endTime: timeLog.endTime && toUnixMs<string>(timeLog.endTime, 'string'),
      description: timeLog.description && timeLog.description.trim(),
      task: task.id,
    };
  }

  private buildTaskTimeLogSuffix(
    task: Task,
    timeLogOrAction?: TimeLog | 'start' | 'stop',
  ): string {
    const suffix: string = `/${ task.id }`;

    if (!timeLogOrAction) {
      return suffix;
    }

    const tail: string | undefined = typeof timeLogOrAction === 'string' ?
      timeLogOrAction :
      timeLogOrAction.id;

    return tail ? `${ suffix }/${ tail }` : suffix;
  }
}
