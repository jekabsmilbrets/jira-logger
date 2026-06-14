import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';

import { catchError, concat, finalize, map, Observable, of, switchMap, throwError, toArray } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate, waitForTurn } from '@core/utils/wait-for.utility';

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

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly requestGate = new RequestGate();

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => concat(...observables)
          .pipe(
            toArray(),
            catchError((error: HttpErrorResponse) => {
              release();
              return throwError(() => error);
            }),
            map(() => true),
            finalize(release),
          )),
      );
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading, this.constructor.name);
  }
}
