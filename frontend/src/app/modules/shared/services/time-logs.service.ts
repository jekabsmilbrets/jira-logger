import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable }                    from '@angular/core';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, switchMap, tap, throwError } from 'rxjs';

import { JsonApi }            from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn }        from '@core/utils/wait-for.utility';

import { adaptTimeLog, adaptTimeLogs } from '@shared/adapters/time-log.adapter';
import { ApiTimeLog }                  from '@shared/interfaces/api/api-time-log.interface';
import { LoadableService }             from '@shared/interfaces/loadable-service.interface';

import { Task }    from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';


@Injectable(
  {
    providedIn: 'root',
  },
)
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
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}` +
      `/${task.id}/${this.baseTimeLogPath}`;

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.get<JsonApi<ApiTimeLog[]>>(url)),
        catchError((error) => {
          console.error(error);
          this.isLoadingSubject.next(false);
          return throwError(() => new Error(error));
        }),
        tap(() => this.isLoadingSubject.next(false)),
        map((response: JsonApi<ApiTimeLog[]>): TimeLog[] => (response.data && adaptTimeLogs(response.data)) as TimeLog[]),
      );
  }

  public create(task: Task, timeLog: TimeLog): Observable<TimeLog> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}` +
      `/${task.id}/${this.baseTimeLogPath}`;

    const body = {
      id: timeLog.id,
      startTime: timeLog.startTime,
      endTime: timeLog.endTime,
      description: timeLog.description,
      task: task.id,
    };

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.post<JsonApi<ApiTimeLog>>(url, body)),
        catchError(this.reportErrors),
        tap(() => this.isLoadingSubject.next(false)),
        map((response: JsonApi<ApiTimeLog>): TimeLog => (response.data && adaptTimeLog(response.data)) as TimeLog),
      );
  }

  public update(task: Task, timeLog: TimeLog): Observable<TimeLog> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}` +
      `/${task.id}/${this.baseTimeLogPath}/${timeLog.id}`;

    const body = {
      id: timeLog.id,
      startTime: timeLog.startTime,
      endTime: timeLog.endTime,
      description: timeLog.description,
      task: task.id,
    };

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.patch<JsonApi<ApiTimeLog>>(url, body)),
        catchError(this.reportErrors),
        tap(() => this.isLoadingSubject.next(false)),
        map((response: JsonApi<ApiTimeLog>): TimeLog => (response.data && adaptTimeLog(response.data)) as TimeLog),
      );
  }

  public delete(task: Task, timeLog: TimeLog): Observable<void> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}` +
      `/${task.id}/${this.baseTimeLogPath}/${timeLog.id}`;

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.delete<void>(url)),
        catchError(this.reportErrors),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }

  private reportErrors(error: HttpErrorResponse): Observable<never> {
    console.error(error);
    this.isLoadingSubject.next(false);
    return throwError(() => new Error(error.message));
  }
}
