import { Injectable } from '@angular/core';

import {
  BehaviorSubject, map, Observable, of, switchMap, take, tap, catchError, throwError, from, concatAll, toArray, filter,
} from 'rxjs';

import { StorageService } from '@core/services/storage.service';

import { ErrorDialogService } from '@shared/services/error-dialog.service';

import { adaptTask } from '@task/adapters/task.adapter';

import { TaskInterface } from '@task/interfaces/task.interface';
import { Task }          from '@task/models/task.model';

@Injectable()
export class TasksService {
  public isLoading$: Observable<boolean>;
  public tasks$: Observable<Task[]>;

  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
  private readonly storeName = 'task';

  constructor(
    private storage: StorageService,
    private errorDialogService: ErrorDialogService,
  ) {
    this.tasks$ = this.tasksSubject.asObservable();
    this.isLoading$ = this.storage.isLoading$;
  }

  public list(): Observable<Task[]> {
    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => this.storage.list(this.storeName),
                 ),
                 take(1),
                 catchError((error) => this.processError(error)),
                 map(
                   (tasksData) => tasksData
                     .map(
                       ([, taskData]: [string, TaskInterface]) => adaptTask(taskData),
                     )
                     .sort(
                       (a: Task, b: Task) => a.createDate.getTime() < b.createDate.getTime() ? 1 : -1,
                     ),
                 ),
                 tap((tasks: Task[]) => this.tasksSubject.next(tasks)),
               );
  }

  public create(task: Task, skipReload: boolean = false): Observable<Task> {
    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => this.storage.create(task.name, task, this.storeName),
                 ),
                 take(1),
                 catchError((error) => this.processError(error)),
                 switchMap(() => this.reloadList(skipReload)),
                 map((tasks: Task[]) => this.findTask(tasks, task)),
               );
  }

  public update(task: Task, skipReload: boolean = false): Observable<Task> {
    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => this.storage.update(task.name, task, this.storeName),
                 ),
                 take(1),
                 catchError((error) => this.processError(error)),
                 switchMap(() => this.reloadList(skipReload)),
                 map((tasks: Task[]) => this.findTask(tasks, task)),
               );
  }

  public delete(task: Task): Observable<void> {
    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => this.storage.delete(task.name, this.storeName),
                 ),
                 take(1),
                 catchError((error) => this.processError(error)),
                 switchMap(
                   () => this.list().pipe(take(1)),
                 ),
                 map(() => undefined),
               );
  }

  public stopAllTaskWorkLogs(ignoreTask: Task): Observable<undefined | Task[]> {
    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => this.tasks$,
                 ),
                 take(1),
                 switchMap(
                   (tasks: Task[]) => {
                     const tasksToStop: Task[] = tasks.filter((task: Task) => task.uuid !== ignoreTask.uuid && task.isTimeLogRunning);

                     tasksToStop.forEach((t: Task) => t.stopTimeLog());

                     if (tasksToStop.length === 0) {
                       return of(undefined);
                     }

                     const taskUpdateObservables = tasksToStop.map((t: Task) => this.update(t, true).pipe(take(1)));

                     return from(taskUpdateObservables)
                       .pipe(
                         concatAll(),
                         toArray(),
                       );
                   },
                 ),
                 catchError((error) => this.processError(error)),
               );

  }

  public importData(data: TaskInterface[]): Observable<boolean> {
    const convertedData: { key: IDBValidKey; value: any }[] = data.map(
      (taskData: TaskInterface) => ({
        key: taskData._name,
        value: taskData,
      }),
    );

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => this.storage.recreateStore(convertedData, this.storeName),
                 ),
               );
  }

  private processError(error: any): Observable<never> {
    console.error({error});

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
                 switchMap(() => throwError(error)),
               );
  }

  private waitForTurn(): Observable<boolean> {
    return this.storage.isLoading$
               .pipe(
                 filter((isLoading) => !isLoading),
                 take(1),
               );
  }

  private reloadList(skipReload: boolean = false): Observable<Task[]> {
    return skipReload ?
           this.tasks$.pipe(take(1)) :
           this.list().pipe(take(1));
  }

  private findTask(tasks: Task[], task: Task): Task {
    const foundTask: Task | undefined = tasks.find(
      (t: Task) => t.uuid === task.uuid,
    );

    if (!foundTask) {
      throw new Error(`Problems creating task "${task.name}"!`);
    }

    return foundTask;
  }
}
