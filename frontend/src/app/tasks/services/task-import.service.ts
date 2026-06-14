import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { catchError, concat, filter, map, Observable, of, switchMap, take, tap, throwError, toArray } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { adaptTasks } from '@shared/adapters/task.adapter';
import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

@Injectable({
  providedIn: 'root',
})
export class TaskImportService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public readonly isLoading$: Observable<boolean>;

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  private readonly isLoadingSignal = signal<boolean>(false);

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  constructor() {
    this.isLoading$ = toObservable(this.isLoading);
  }

  public importData(
    data: ApiTask[],
  ): Observable<boolean> {
    const observables: Observable<Task>[] = [];
    const tasks: Task[] = adaptTasks(data);

    tasks.forEach(
      (task: Task) => observables.push(
        this.tasksService.create(task)
          .pipe(
            switchMap(
              (updatedTask: Task) => concat(
                ...task.timeLogs.map(
                  (timeLog: TimeLog) => this.timeLogsService.create(
                    updatedTask,
                    timeLog,
                  ),
                ),
              )
                .pipe(
                  switchMap(() => of(updatedTask)),
                ),
            ),
          ),
      ),
    );

    return this.waitForTurn()
      .pipe(
        switchMap(() => concat(...observables)),
        toArray(),
        catchError((error: HttpErrorResponse) => {
          this.isLoadingSignal.set(false);
          return throwError(() => error);
        }),
        map(() => true),
        tap(() => this.isLoadingSignal.set(false)),
      );
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
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
}
