import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTasks } from '@shared/adapters/task.adapter';
import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { BehaviorSubject, catchError, concat, map, Observable, of, switchMap, tap, throwError, toArray } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskImportService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public isLoading$: Observable<boolean>;

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    this.isLoading$ = this.isLoadingSubject.asObservable();
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

    return waitForTurn(
      this.isLoading$,
      this.isLoadingSubject,
    )
      .pipe(
        switchMap(() => concat(...observables)),
        toArray(),
        catchError((error: HttpErrorResponse) => {
          this.isLoadingSubject.next(false);
          return throwError(() => error);
        }),
        map(() => true),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }
}
