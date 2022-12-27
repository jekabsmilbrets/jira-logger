import { formatDate }                                from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable }                                from '@angular/core';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { appLocale, appTimeZone } from '@core/constants/date-time.constant';
import { JsonApi }                from '@core/interfaces/json-api.interface';
import { LoaderStateService }     from '@core/services/loader-state.service';
import { StorageService }         from '@core/services/storage.service';
import { waitForTurn }            from '@core/utils/wait-for.utility';

import { adaptTasks }         from '@shared/adapters/task.adapter';
import { ApiTask }            from '@shared/interfaces/api/api-task.interface';
import { LoadableService }    from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { TaskListFilter }     from '@shared/interfaces/task-list-filter.interface';
import { Tag }                from '@shared/models/tag.model';
import { Task }               from '@shared/models/task.model';
import { ErrorDialogService } from '@shared/services/error-dialog.service';


@Injectable({
  providedIn: 'root',
})
export class TasksService implements LoadableService, MakeRequestService {
  public isLoading$: Observable<boolean>;
  public tasks$: Observable<Task[]>;

  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

  private basePath = 'task';

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    public readonly loaderStateService: LoaderStateService,
    private http: HttpClient,
    private storage: StorageService,
    private errorDialogService: ErrorDialogService,
  ) {
    this.tasks$ = this.tasksSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public list(): Observable<Task[]> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }`;

    return this.makeRequest<JsonApi<ApiTask[]>>(
      url,
      'get',
      null,
      false,
    )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of({data: []});
          }
          return this.processError(error);
        }),
        map(
          (response: JsonApi<ApiTask[]>) => (response.data && adaptTasks(response.data)) as Task[],
        ),
        tap((tasks: Task[]) => this.tasksSubject.next(tasks)),
      );
  }

  public filteredList(
    filter: TaskListFilter,
    updateTaskList: boolean = false,
  ): Observable<Task[]> {
    let url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }`;

    const outputQueryParams = this.buildQueryParams(filter);

    if (Object.keys(outputQueryParams).length > 0) {
      url += '?' + new HttpParams({fromObject: outputQueryParams}).toString();
    }

    return this.makeRequest<JsonApi<ApiTask[]>>(
      url,
      'get',
      null,
      false,
    )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of({data: []});
          }
          return this.processError(error);
        }),
        map(
          (response: JsonApi<ApiTask[]>) => (response.data && adaptTasks(response.data)) as Task[],
        ),

        tap((tasks: Task[]) => {
          if (updateTaskList) {
            this.tasksSubject.next(tasks);
          }
        }),
      );
  }

  public create(
    task: Task,
    skipReload: boolean = false,
  ): Observable<Task> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }`;

    const body = {
      name: task.name && task.name.trim(),
      description: task.description && task.description.trim(),
      tags: task.tags.map((tag: Tag) => tag.id),
    };

    return this.makeRequest<JsonApi<ApiTask>>(
      url,
      'post',
      body,
      true,
    )
      .pipe(
        switchMap(() => this.reloadList(skipReload)),
        map((tasks: Task[]) => this.findTask(tasks, task)),
      );
  }

  public update(
    task: Task,
    skipReload: boolean = false,
  ): Observable<Task> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }/${ task.id }`;

    const body = {
      id: task.id,
      name: task.name && task.name.trim(),
      description: task.description && task.description.trim(),
      tags: task.tags.map((tag: Tag) => tag.id),
    };

    return this.makeRequest<JsonApi<ApiTask>>(
      url,
      'patch',
      body,
      true,
    )
      .pipe(
        switchMap(() => this.reloadList(skipReload)),
        map((tasks: Task[]) => this.findTask(tasks, task)),
      );
  }

  public delete(
    task: Task,
  ): Observable<void> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }/${ task.id }`;

    return this.makeRequest<void>(
      url,
      'delete',
      null,
      true,
    )
      .pipe(
        switchMap(
          () => this.list().pipe(take(1)),
        ),
        map(() => undefined),
      );
  }

  public taskExist(
    name: string,
  ): Observable<null> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }/exist/${ name }`;

    return this.makeRequest<void>(
      url,
      'get',
    )
      .pipe(
        catchError(this.processError),
        map(() => null),
      );
  }

  public syncDateToJiraApi(
    task: Task,
    date: Date,
  ): Observable<boolean> {
    const formattedDate = formatDate(
      date,
      'yyyy-MM-dd',
      'lv',
    );
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }/${ task.id }/${ formattedDate }`;

    return this.makeRequest<void>(
      url,
      'get',
    )
      .pipe(
        map(() => true),
      );
  }

  public makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    body: any                                   = null,
    reportError: boolean                        = false,
  ): Observable<T> {
    let request$: Observable<T>;

    switch (method) {
      case 'post':
        request$ = this.http.post<T>(url, body);
        break;

      case 'patch':
        request$ = this.http.patch<T>(url, body);
        break;

      case 'delete':
        request$ = this.http.delete<T>(url);
        break;

      case 'get':
      default:
        request$ = this.http.get<T>(url);
        break;
    }

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => request$),
        catchError((error) => {
          if (reportError) {
            return this.processError(error);
          }

          this.isLoadingSubject.next(false);
          return throwError(() => error);
        }),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }

  private buildQueryParams(
    filter: TaskListFilter,
  ) {
    const format = 'YYYY-MM-dd HH:mm:ss';
    const formatDateForUri = (date: Date) => formatDate(date, format, appLocale, appTimeZone);

    const outputQueryParams: {
      hideUnreported?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      tags?: string;
      name?: string;
    } = {};

    if (filter.hideUnreported) {
      outputQueryParams.hideUnreported = String(filter.hideUnreported);
    }

    if (filter.date) {
      outputQueryParams.date = formatDateForUri(filter.date);
    }

    if (filter.startDate) {
      outputQueryParams.startDate = formatDateForUri(filter.startDate);
    }

    if (filter.endDate) {
      outputQueryParams.endDate = formatDateForUri(filter.endDate);
    }

    if (filter.tags) {
      outputQueryParams.tags = filter.tags.join(',');
    }

    if (filter.name) {
      outputQueryParams.name = filter.name;
    }

    return outputQueryParams;
  }

  private processError(
    error: any,
  ): Observable<never> {
    console.error({error});
    this.isLoadingSubject.next(false);

    return this.tasks$
      .pipe(
        take(1),
        switchMap(
          (tasks: Task[]) => this.errorDialogService.openDialog(
            {
              errorTitle: 'Error while doing db action :D',
              errorMessage: JSON.stringify(error),
              idbData: tasks,
            },
          ),
        ),
        take(1),
        switchMap(() => throwError(() => error)),
      );
  }

  private reloadList(
    skipReload: boolean = false,
  ): Observable<Task[]> {
    return skipReload ?
      this.tasks$.pipe(take(1)) :
      this.list().pipe(take(1));
  }

  private findTask(
    tasks: Task[],
    task: Task,
  ): Task {
    const foundTask: Task | undefined = tasks.find(
      (t: Task) => (task.id && t.id === task.id) || t.name === task.name,
    );

    if (!foundTask) {
      throw new Error(`Problems creating task "${ task.name }"!`);
    }

    return foundTask;
  }
}
