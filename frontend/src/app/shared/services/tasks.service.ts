import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { adaptTasks } from '@shared/adapters/task.adapter';
import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { ErrorDialogService } from '@shared/services/error-dialog.service';
import { TaskQueryService } from '@shared/services/task-query.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class TasksService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly taskQueryService: TaskQueryService = inject(TaskQueryService);
  private readonly taskResource: ResourceRequestHandle = this.apiRequestService.resource('task');
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialogService> = injectAsync(
    () => import('@shared/services/error-dialog.service')
      .then((m) => m.ErrorDialogService),
  );

  private readonly tasksSignal: WritableSignal<Task[]> = signal<Task[]>([]);
  private readonly allTasksSignal: WritableSignal<Task[]> = signal<Task[]>([]);

  public readonly isLoading: Signal<boolean> = this.taskResource.isLoading;
  public readonly tasks: Signal<Task[]> = this.tasksSignal.asReadonly();
  public readonly recentTasks: Signal<Task[]> = computed(() => [
      ...this.tasksSignal(),
    ].sort(
      (a: Task, b: Task) =>
        (b.lastTimeLogStartTime?.getTime() ?? -1) - (a.lastTimeLogStartTime?.getTime() ?? -1),
    ),
  );
  public readonly allTasks: Signal<Task[]> = this.allTasksSignal.asReadonly();

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'TasksService',
    );
  }

  public list(): Observable<Task[]> {
    return this.taskResource.listRequest<ApiTask>()
      .pipe(
        catchError((error: HttpErrorResponse) => this.processError(error)),
        map((tasks: ApiTask[]) => adaptTasks(tasks)),
        tap((tasks: Task[]) => {
          this.tasksSignal.set(tasks);
          this.allTasksSignal.set(tasks);
        }),
      );
  }

  public loadVisibleTasks(
    filter: TaskListFilter,
  ): Observable<Task[]> {
    return this.taskQueryService.query(filter)
      .pipe(
        tap((tasks: Task[]) => {
          this.tasksSignal.set(tasks);

          if (Object.keys(filter).length === 0) {
            this.allTasksSignal.set(tasks);
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

    return this.taskResource.request<void>(
      url,
      'delete',
      null,
      (error: unknown) => this.processError(error),
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

    return this.taskResource.request<void>(
      url,
      'get',
    )
      .pipe(
        catchError((error: unknown) => {
          if (this.isConflictError(error)) {
            return throwError(() => error);
          }

          return this.processError(error);
        }),
        map(() => null),
      );
  }

  private isConflictError(
    error: unknown,
  ): boolean {
    return this.getErrorStatus(error) === 409;
  }

  private getErrorStatus(
    error: unknown,
  ): number | undefined {
    if (error instanceof HttpErrorResponse) {
      return error.status;
    }

    return typeof error === 'object'
    && error !== null
    && 'status' in error
    && typeof error.status === 'number' ?
      error.status :
      undefined;
  }

  private processError(
    error: unknown,
  ): Observable<never> {
    return openLoadErrorDialog(
      this.loadErrorDialogService,
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
    return this.taskResource.request(
      url,
      method,
      this.buildTaskRequestBody(task),
      (error: unknown) => this.processError(error),
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
