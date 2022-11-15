import { formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

import { appLocale, appTimeLogDateTimeFormat, appTimeZone } from '@core/constants/date-time.constant';

import { JsonApi }            from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn }        from '@core/utils/wait-for.utility';

import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import { ApiTimeLog }                  from '@shared/interfaces/api/api-time-log.interface';
import { LoadableService }             from '@shared/interfaces/loadable-service.interface';

import { Task }    from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';


@Injectable({
  providedIn: 'root',
})
export class TimeLogsService implements LoadableService {
  public isLoading$: Observable<boolean>;

  private basePath = 'task';
  private baseTimeLogPath = 'time-log';

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    public readonly loaderStateService: LoaderStateService,
    private http: HttpClient,
  ) {
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public list(task: Task): Observable<TimeLog[]> {
    return this.makeRequest(
      task,
    )
      .pipe(
        map((response: JsonApi<ApiTimeLog[]>): TimeLog[] => (response.data && adaptTimeLogs(response.data)) as TimeLog[]),
      );
  }

  public create(task: Task, timeLog: TimeLog): Observable<TimeLog> {
    const body = {
      id: timeLog.id,
      startTime: timeLog.startTime && formatDate(timeLog.startTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
      endTime: timeLog.endTime && formatDate(timeLog.endTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
      description: timeLog.description,
      task: task.id,
    };

    return this.makeRequest(
      task,
      'post',
      timeLog.id,
      body,
    )
      .pipe(
        map((response: JsonApi<ApiTimeLog>): TimeLog => (response.data && adaptTimeLog(response.data)) as TimeLog),
      );
  }

  public update(task: Task, timeLog: TimeLog): Observable<TimeLog> {
    const body = {
      id: timeLog.id,
      startTime: timeLog.startTime && formatDate(timeLog.startTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
      endTime: timeLog.endTime && formatDate(timeLog.endTime, appTimeLogDateTimeFormat, appLocale, appTimeZone),
      description: timeLog.description,
      task: task.id,
    };

    return this.makeRequest(
      task,
      'patch',
      timeLog.id,
      body,
    )
      .pipe(
        map((response: JsonApi<ApiTimeLog>): TimeLog => (response.data && adaptTimeLog(response.data)) as TimeLog),
      );
  }

  public delete(task: Task, timeLog: TimeLog): Observable<void> {
    return this.makeRequest(
      task,
      'delete',
      timeLog.id,
    );
  }

  public start(task: Task): Observable<void> {
    return this.makeRequest(
      task,
      'get',
      'start',
    );
  }

  public stop(task: Task): Observable<void> {
    return this.makeRequest(
      task,
      'get',
      'stop',
    );
  }

  private makeRequest(
    task: Task,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    path: string                                = '',
    body: any                                   = null,
    reportError: boolean                        = false,
  ): Observable<any> {
    let url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }` +
      `/${ task.id }/${ this.baseTimeLogPath }`;

    if (path) {
      url += `/${ path }`;
    }

    let request$: Observable<any> = of({});

    switch (method) {
      case 'post':
        request$ = this.http.post(url, body);
        break;

      case 'patch':
        request$ = this.http.patch(url, body);
        break;

      case 'delete':
        request$ = this.http.delete(url);
        break;

      case 'get':
      default:
        request$ = this.http.get(url);
        break;
    }

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => request$),
        catchError((error) => {
          console.error(error);
          this.isLoadingSubject.next(false);
          return throwError(() => error);
        }),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }
}
