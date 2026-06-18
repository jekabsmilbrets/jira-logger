import { formatDate } from '@angular/common';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import type { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { LocaleService } from '@core/services/locale.service';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { runGatedRequest } from '@core/utilities/run-gated-request.utility';

import { adaptTasks } from '@shared/adapters/task.adapter';
import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import type { LoadableService } from '@shared/interfaces/loadable-service.interface';
import type { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { ErrorDialogService } from '@shared/services/error-dialog.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import type { QueryParams } from '@shared/types/query-params.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class TasksService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialogService> = injectAsync(
    () => import('@shared/services/error-dialog.service').then((m) => m.ErrorDialogService),
  );
  private readonly localeService: LocaleService = inject(LocaleService);

  private readonly tasksSignal: WritableSignal<Task[]> = signal<Task[]>([]);
  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();
  public readonly tasks: Signal<Task[]> = this.tasksSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  private basePath: string = 'task';

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading, this.constructor.name);
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
    return this.saveTask(
      task,
      '',
      'post',
      skipReload,
    );
  }

  public update(
    task: Task,
    skipReload: boolean = false,
  ): Observable<Task> {
    return this.saveTask(
      task,
      `/${ task.id }`,
      'patch',
      skipReload,
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
        catchError((error: unknown) => {
          if (
            (error instanceof HttpErrorResponse && error.status === 409) ||
            (
              typeof error === 'object' &&
              error !== null &&
              'status' in error &&
              error.status === 409
            )
          ) {
            return throwError(() => error);
          }

          return this.processError(error);
        }),
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

    return runGatedRequest(
      this.requestGate,
      this.isLoadingSignal,
      request$,
      reportError ?
        (error: unknown) => this.processError(error) as Observable<T> :
        undefined,
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
    return openLoadErrorDialog(
      this.loadErrorDialogService,
      this.isLoadingSignal,
      error,
      this.tasks(),
    );
  }

  private saveTask(
    task: Task,
    url: string,
    method: 'post' | 'patch',
    skipReload: boolean,
  ): Observable<Task> {
    return this.makeRequest<JsonApi<ApiTask>>(
      url,
      method,
      this.buildTaskRequestBody(task),
      true,
    )
      .pipe(
        switchMap(() => this.reloadList(skipReload)),
        map((tasks: Task[]) => this.findTask(tasks, task)),
      );
  }

  private buildTaskRequestBody(
    task: Task,
  ): ApiRequestBody {
    return {
      id: task.id,
      name: task.name && task.name.trim(),
      description: task.description && task.description.trim(),
      tags: task.tags.map((tag: Tag) => tag.id),
    };
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
