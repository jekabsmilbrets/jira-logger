import { formatDate } from '@angular/common';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { LocaleService } from '@core/services/locale.service';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTasks } from '@shared/adapters/task.adapter';
import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { ApiRequestBody } from '@shared/types/api-request-body.type';
import { QueryParams } from '@shared/types/query-params.type';

import { BehaviorSubject, catchError, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TasksService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public isLoading$: Observable<boolean>;
  public tasks$: Observable<Task[]>;

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly errorDialogService: ErrorDialogService = inject(ErrorDialogService);
  private readonly localeService: LocaleService = inject(LocaleService);

  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);

  private basePath: string = 'task';

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    this.tasks$ = this.tasksSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public list(): Observable<Task[]> {
    return this.makeRequest<JsonApi<ApiTask[]>>(
      '',
      'get',
      null,
      false,
    )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of({ data: [] });
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
    let url: string = '';

    const outputQueryParams: QueryParams = this.buildQueryParams(filter);

    if (Object.keys(outputQueryParams).length > 0) {
      url += '?' + new HttpParams({ fromObject: outputQueryParams }).toString();
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
            return of({ data: [] });
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
    const body: ApiRequestBody = {
      name: task.name && task.name.trim(),
      description: task.description && task.description.trim(),
      tags: task.tags.map((tag: Tag) => tag.id),
    };

    return this.makeRequest<JsonApi<ApiTask>>(
      '',
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
    const url: string = `/${ task.id }`;

    const body: ApiRequestBody = {
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
    const url: string = `/${ task.id }`;

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
    const url: string = `/exist/${ name }`;

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
    const formattedDate: string = formatDate(
      date,
      'yyyy-MM-dd',
      this.localeService.locale,
    );
    const url: string = `/${ task.id }/${ formattedDate }`;

    return this.makeRequest<void>(
      url,
      'post',
    )
      .pipe(
        map(() => true),
      );
  }

  public makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    body: ApiRequestBody | null = null,
    reportError: boolean = false,
  ): Observable<T> {
    const request$: Observable<T> = this.apiRequestService.request<T>(
      this.apiRequestService.buildApiUrl(this.basePath, url),
      method,
      body,
    );

    return waitForTurn(
      this.isLoading$,
      this.isLoadingSubject,
    )
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
  ): QueryParams {
    const outputQueryParams: QueryParams = {};

    if (filter.hideUnreported) {
      outputQueryParams.hideUnreported = String(filter.hideUnreported);
    }

    if (filter.date) {
      outputQueryParams.date = this.formatDateForQuery(filter.date);
    }

    if (filter.startDate) {
      outputQueryParams.startDate = this.formatDateForQuery(filter.startDate);
    }

    if (filter.endDate) {
      outputQueryParams.endDate = this.formatDateForQuery(filter.endDate);
    }

    if (filter.tags) {
      outputQueryParams.tags = filter.tags.join(',');
    }

    if (filter.name) {
      outputQueryParams.name = filter.name;
    }

    return outputQueryParams;
  }

  private formatDateForQuery(
    date: Date,
  ): string {
    const year: string = String(date.getFullYear());
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');

    return `${ year }-${ month }-${ day }`;
  }

  private processError(
    error: unknown,
  ): Observable<never> {
    this.isLoadingSubject.next(false);

    return this.tasks$
      .pipe(
        take(1),
        switchMap(
          (tasks: Task[]) => this.errorDialogService.openDialog({
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
    return (
      skipReload ?
        this.tasks$ :
        this.list()
    )
      .pipe(take(1));
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
