import { formatDate }                    from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable }                    from '@angular/core';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { appLocale, appTimeZone } from '@core/constants/date-time.constant';

import { JsonApi }            from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';

import { StorageService } from '@core/services/storage.service';
import { waitForTurn }    from '@core/utils/wait-for.utility';

import { adaptTasks }      from '@shared/adapters/task.adapter';
import { ApiTask }         from '@shared/interfaces/api/api-task.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { TaskListFilter }  from '@shared/interfaces/task-list-filter.interface';

import { Tag }  from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { ErrorDialogService } from '@shared/services/error-dialog.service';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class TasksService implements LoadableService {
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
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}`;

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.get<JsonApi<ApiTask[]>>(url)),
        catchError((error: HttpErrorResponse) => {
          this.isLoadingSubject.next(false);
          if (error.status === 404) {
            return of({data: []});
          }
          return this.processError(error);
        }),
        map(
          (response: JsonApi<ApiTask[]>) => (response.data && adaptTasks(response.data)) as Task[],
        ),
        tap((tasks: Task[]) => this.tasksSubject.next(tasks)),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }

  public filteredList(
    filter: TaskListFilter,
  ): Observable<Task[]> {
    let url = `${environment.apiHost}${environment.apiBase}/${this.basePath}`;

    const format = 'YYYY-MM-dd HH:mm:ss';
    const formatDateForUri = (date: Date) => encodeURIComponent(formatDate(date, format, appLocale, appTimeZone));

    url += `?hideUnreported=${filter.hideUnreported}`;

    if (filter.date) {
      url += `&date=${formatDateForUri(filter.date)}`;
    }

    if (filter.startDate) {
      url += `&startDate=${formatDateForUri(filter.startDate)}`;
    }

    if (filter.endDate) {
      url += `&endDate=${formatDateForUri(filter.endDate)}`;
    }

    if (filter.tags) {
      url += `&tags=${filter.tags.join(',')}`;
    }

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.get<JsonApi<ApiTask[]>>(url)),
        catchError((error: HttpErrorResponse) => {
          this.isLoadingSubject.next(false);
          if (error.status === 404) {
            return of({data: []});
          }
          return this.processError(error);
        }),
        map(
          (response: JsonApi<ApiTask[]>) => (response.data && adaptTasks(response.data)) as Task[],
        ),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }

  public create(task: Task, skipReload: boolean = false): Observable<Task> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}`;

    const body = {
      name: task.name,
      description: task.description,
      tags: task.tags.map((tag: Tag) => tag.id),
    };

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.post<JsonApi<ApiTask[]>>(url, body)),
        catchError((error) => this.processError(error)),
        tap(() => this.isLoadingSubject.next(false)),
        switchMap(() => this.reloadList(skipReload)),
        map((tasks: Task[]) => this.findTask(tasks, task)),
      );
  }

  public update(task: Task, skipReload: boolean = false): Observable<Task> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}/${task.id}`;

    const body = {
      id: task.id,
      name: task.name,
      description: task.description,
      tags: task.tags.map((tag: Tag) => tag.id),
    };

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.patch<JsonApi<ApiTask[]>>(url, body)),
        catchError((error) => this.processError(error)),
        tap(() => this.isLoadingSubject.next(false)),
        switchMap(() => this.reloadList(skipReload)),
        map((tasks: Task[]) => this.findTask(tasks, task)),
      );
  }

  public delete(task: Task): Observable<void> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}/${task.id}`;

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.delete<void>(url)),
        catchError((error) => this.processError(error)),
        tap(() => this.isLoadingSubject.next(false)),
        switchMap(
          () => this.list().pipe(take(1)),
        ),
        map(() => undefined),
      );
  }

  private processError(error: any): Observable<never> {
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

  private reloadList(skipReload: boolean = false): Observable<Task[]> {
    return skipReload ?
           this.tasks$.pipe(take(1)) :
           this.list().pipe(take(1));
  }

  private findTask(tasks: Task[], task: Task): Task {
    const foundTask: Task | undefined = tasks.find(
      (t: Task) => (task.id && t.id === task.id) || t.name === task.name,
    );

    if (!foundTask) {
      throw new Error(`Problems creating task "${task.name}"!`);
    }

    return foundTask;
  }
}
