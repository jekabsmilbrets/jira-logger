import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';

import { catchError, finalize, map, Observable, of, Subject, switchMap, tap, throwError } from 'rxjs';

import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utils/request-gate.utility';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ApiRequestBody } from '@shared/types/api-request-body.type';
import { toUnixMs } from '@shared/utils/to-unix-ms.util';

@Injectable({
  providedIn: 'root',
})
export class TimeLogsService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public taskStarted$: Observable<Task>;
  public taskFinished$: Observable<Task>;

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly requestGate = new RequestGate();

  private basePath: string = 'task';
  private baseTimeLogPath: string = 'time-log';

  private taskStartedSubject: Subject<Task> = new Subject<Task>();
  private taskFinishedSubject: Subject<Task> = new Subject<Task>();

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  constructor() {
    this.taskStarted$ = this.taskStartedSubject.asObservable();
    this.taskFinished$ = this.taskFinishedSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading, this.constructor.name);
  }

  public list(
    task: Task,
  ): Observable<TimeLog[]> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }`;

    return this.makeRequest<JsonApi<ApiTimeLog[]>>(url)
      .pipe(
        map((response: JsonApi<ApiTimeLog[]>): TimeLog[] => (response.data && adaptTimeLogs(response.data)) as TimeLog[]),
        catchError((error: HttpErrorResponse) => {
          const errors: string[] = Array.isArray(error.error?.errors) ? error.error.errors : [];

          if (error.status === 404 && errors.includes('TimeLogs not found')) {
            return of([]);
          }

          return throwError(() => error);
        }),
      );
  }

  public create(
    task: Task,
    timeLog: TimeLog,
  ): Observable<TimeLog> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }`;

    const body: ApiRequestBody = {
      id: timeLog.id,
      startTime: timeLog.startTime && toUnixMs<string>(timeLog.startTime, 'string'),
      endTime: timeLog.endTime && toUnixMs<string>(timeLog.endTime, 'string'),
      description: timeLog.description && timeLog.description.trim(),
      task: task.id,
    };

    return this.makeRequest<JsonApi<ApiTimeLog>>(
      url,
      'post',
      body,
    )
      .pipe(
        map((response: JsonApi<ApiTimeLog>): TimeLog => (response.data && adaptTimeLog(response.data)) as TimeLog),
      );
  }

  public update(
    task: Task,
    timeLog: TimeLog,
  ): Observable<TimeLog> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }/${ timeLog.id }`;

    const body: ApiRequestBody = {
      id: timeLog.id,
      startTime: timeLog.startTime && toUnixMs<string>(timeLog.startTime, 'string'),
      endTime: timeLog.endTime && toUnixMs<string>(timeLog.endTime, 'string'),
      description: timeLog.description && timeLog.description.trim(),
      task: task.id,
    };

    return this.makeRequest<JsonApi<ApiTimeLog>>(
      url,
      'patch',
      body,
    )
      .pipe(
        map((response: JsonApi<ApiTimeLog>): TimeLog => (response.data && adaptTimeLog(response.data)) as TimeLog),
      );
  }

  public delete(
    task: Task,
    timeLog: TimeLog,
  ): Observable<void> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }/${ timeLog.id }`;

    return this.makeRequest<void>(
      url,
      'delete',
    );
  }

  public start(
    task: Task,
  ): Observable<void> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }/start`;

    return this.makeRequest<void>(
      url,
      'post',
    )
      .pipe(
        tap(() => this.taskStartedSubject.next(task)),
      );
  }

  public stop(
    task: Task,
  ): Observable<void> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }/stop`;

    return this.makeRequest<void>(
      url,
      'post',
    )
      .pipe(
        tap(() => this.taskFinishedSubject.next(task)),
      );
  }

  public makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    body: ApiRequestBody | null = null,
  ): Observable<T> {
    const request$: Observable<T> = this.apiRequestService.request<T>(
      this.apiRequestService.buildApiUrl(this.basePath, url),
      method,
      body,
    );

    return waitForTurn(
      this.requestGate,
      this.isLoadingSignal,
    )
      .pipe(
        switchMap((release: VoidFunction) => request$
          .pipe(
            catchError((error: HttpErrorResponse) => {
              release();
              return throwError(() => error);
            }),
            finalize(release),
          )),
      );
  }
}
