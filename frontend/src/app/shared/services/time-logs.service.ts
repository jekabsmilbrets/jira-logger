import { formatDate } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { appLocale, appTimeLogDateTimeFormat, appTimeZone } from '@core/constants/date-time.constant';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ApiRequestBody } from '@shared/types/api-request-body.type';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, Subject, switchMap, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TimeLogsService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public isLoading$: Observable<boolean>;
  public taskStarted$: Observable<Task>;
  public taskFinished$: Observable<Task>;

  private readonly httpClient: HttpClient = inject(HttpClient);

  private basePath: string = 'task';
  private baseTimeLogPath: string = 'time-log';

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private taskStartedSubject: Subject<Task> = new Subject<Task>();
  private taskFinishedSubject: Subject<Task> = new Subject<Task>();

  constructor() {
    this.isLoading$ = this.isLoadingSubject.asObservable();
    this.taskStarted$ = this.taskStartedSubject.asObservable();
    this.taskFinished$ = this.taskFinishedSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public list(
    task: Task,
  ): Observable<TimeLog[]> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }`;

    return this.makeRequest<JsonApi<ApiTimeLog[]>>(url)
      .pipe(
        map((response: JsonApi<ApiTimeLog[]>): TimeLog[] => (response.data && adaptTimeLogs(response.data)) as TimeLog[]),
      );
  }

  public create(
    task: Task,
    timeLog: TimeLog,
  ): Observable<TimeLog> {
    const url: string = `/${ task.id }/${ this.baseTimeLogPath }`;

    const body: ApiRequestBody = {
      id: timeLog.id,
      startTime: timeLog.startTime && formatDate(timeLog.startTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
      endTime: timeLog.endTime && formatDate(timeLog.endTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
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
      startTime: timeLog.startTime && formatDate(timeLog.startTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
      endTime: timeLog.endTime && formatDate(timeLog.endTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
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
      'get',
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
      'get',
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
    let request$: Observable<T>;

    url = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }` + url;

    switch (method) {
      case 'post':
        request$ = this.httpClient.post<T>(url, body);
        break;

      case 'patch':
        request$ = this.httpClient.patch<T>(url, body);
        break;

      case 'delete':
        request$ = this.httpClient.delete<T>(url);
        break;

      case 'get':
      default:
        request$ = this.httpClient.get<T>(url);
        break;
    }

    return waitForTurn(
      this.isLoading$,
      this.isLoadingSubject,
    )
      .pipe(
        switchMap(() => request$),
        catchError((error: HttpErrorResponse) => {
          this.isLoadingSubject.next(false);

          return throwError(() => error);
        }),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }
}
