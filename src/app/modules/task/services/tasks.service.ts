import { Injectable } from '@angular/core';

import { BehaviorSubject, map, Observable, of, switchMap, take, tap, catchError, throwError, from, concatAll, toArray } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

import { adaptTask } from '@task/adapters/task.adapter';

import { TaskInterface } from '@task/interfaces/task.interface';
import { Task }          from '@task/models/task.model';

@Injectable()
export class TasksService {
  public tasks$: Observable<Task[]>;

  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
  private readonly storeName = 'task';

  constructor(
    private storage: StorageService,
  ) {
    this.tasks$ = this.tasksSubject.asObservable();
  }

  private static processError(error: any): Observable<never> {
    console.error({error});
    return throwError(error);
  }

  public list(): Observable<Task[]> {
    return this.storage.list(this.storeName)
               .pipe(
                 take(1),
                 catchError((error) => TasksService.processError(error)),
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
    return this.storage.create(task.name, task, this.storeName)
               .pipe(
                 take(1),
                 catchError((error) => TasksService.processError(error)),
                 switchMap(() => this.reloadList(skipReload)),
                 map((tasks: Task[]) => this.findTask(tasks, task)),
               );
  }

  public update(task: Task, skipReload: boolean = false): Observable<Task> {
    return this.storage.update(task.name, task, this.storeName)
               .pipe(
                 take(1),
                 catchError((error) => TasksService.processError(error)),
                 switchMap(() => this.reloadList(skipReload)),
                 map((tasks: Task[]) => this.findTask(tasks, task)),
               );
  }

  public delete(task: Task): Observable<void> {
    return this.storage.delete(task.name, this.storeName)
               .pipe(
                 take(1),
                 catchError((error) => TasksService.processError(error)),
                 switchMap(
                   () => this.list().pipe(take(1)),
                 ),
                 map(() => undefined),
               );
  }

  public stopAllTaskWorkLogs(ignoreTask: Task): Observable<undefined | Task[]> {
    return this.tasks$
               .pipe(
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
                 catchError((error) => TasksService.processError(error)),
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
