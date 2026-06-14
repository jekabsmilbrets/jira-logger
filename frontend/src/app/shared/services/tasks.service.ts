import { formatDate } from '@angular/common';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { catchError, filter, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { LocaleService } from '@core/services/locale.service';

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

@Injectable({
  providedIn: 'root',
})
export class TasksService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public readonly isLoading$: Observable<boolean>;

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly errorDialogService: ErrorDialogService = inject(ErrorDialogService);
  private readonly localeService: LocaleService = inject(LocaleService);

  private readonly tasksSignal = signal<Task[]>([]);
  private readonly isLoadingSignal = signal<boolean>(false);

  private basePath: string = 'task';

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  public get tasks(): Signal<Task[]> {
    return this.tasksSignal.asReadonly();
  }

  constructor() {
    this.isLoading$ = toObservable(this.isLoading);
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
        tap((tasks: Task[]) => this.tasksSignal.set(tasks)),
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
            this.tasksSignal.set(tasks);
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
        catchError(this.processError.bind(this)),
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

    return this.waitForTurn()
      .pipe(
        switchMap(() => request$),
        catchError((error) => {
          if (reportError) {
            return this.processError(error);
          }

          this.isLoadingSignal.set(false);
          return throwError(() => error);
        }),
        tap(() => this.isLoadingSignal.set(false)),
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
    this.isLoadingSignal.set(false);

    return this.errorDialogService.openDialog({
      errorTitle: 'Error while doing db action :D',
      errorMessage: JSON.stringify(error),
      idbData: this.tasks(),
    })
      .pipe(
        take(1),
        switchMap(() => throwError(() => error)),
      );
  }

  private reloadList(
    skipReload: boolean = false,
  ): Observable<Task[]> {
    return (
      skipReload ?
        of(this.tasks()) :
        this.list()
    )
      .pipe(take(1));
  }

  private waitForTurn(): Observable<boolean> {
    if (!this.isLoadingSignal()) {
      this.isLoadingSignal.set(true);
      return of(true);
    }

    return this.isLoading$
      .pipe(
        filter((isLoading: boolean) => !isLoading),
        take(1),
        tap(() => this.isLoadingSignal.set(true)),
      );
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
