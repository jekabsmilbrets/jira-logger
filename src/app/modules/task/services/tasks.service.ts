import { Injectable } from '@angular/core';

import { BehaviorSubject, map, Observable, of, switchMap, take, tap } from 'rxjs';

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

  public list(): Observable<Task[]> {
    return this.storage.list(this.storeName)
               .pipe(
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

  public create(task: Task): Observable<Task> {
    return this.storage.create(task.name, task, this.storeName)
               .pipe(
                 switchMap(
                   () => this.list().pipe(take(1)),
                 ),
                 switchMap(
                   (tasks: Task[]) => {
                     const foundTask: Task | undefined = this.findTask(tasks, task.name);

                     if (!foundTask) {
                       throw new Error(`Problems creating task "${task.name}"!`);
                     }

                     return of(foundTask);
                   },
                 ),
               );
  }

  public update(task: Task): Observable<Task> {
    return this.storage.update(task.name, task, this.storeName)
               .pipe(
                 switchMap(
                   () => this.list().pipe(take(1)),
                 ),
                 switchMap(
                   (tasks: Task[]) => {
                     const foundTask: Task | undefined = this.findTask(tasks, task.name);

                     if (!foundTask) {
                       throw new Error(`Problems updating task "${task.name}"!`);
                     }

                     return of(foundTask);
                   },
                 ),
               );
  }

  public delete(task: Task): Observable<void> {
    return this.storage.delete(task.name, this.storeName)
               .pipe(
                 switchMap(
                   () => this.list().pipe(take(1)),
                 ),
                 switchMap(() => of(undefined)),
               );
  }

  public stopAllTaskWorkLogs(ignoreTask: Task): Observable<void> {
    return this.tasks$
               .pipe(
                 switchMap(
                   (tasks: Task[]) => {
                     const data = this.findAndFilterTasksForTimeLogStop(tasks, ignoreTask);

                     if (data.length === 0) {
                       return of(undefined);
                     }

                     return this.storage.massUpdate(
                       data,
                       this.storeName,
                     );
                   },
                 ),
               );

  }

  private findAndFilterTasksForTimeLogStop(tasks: Task[], ignoreTask: Task): { key: IDBValidKey; value: any }[] {
    return tasks
      .filter((task: Task) => task.uuid !== ignoreTask.uuid)
      .map(
        (task: Task) => {
          task.stopTimeLog();

          return {
            key: task.name,
            value: task,
          };
        },
      );
  }

  private findTask(tasks: Task[], taskName: string): Task | undefined {
    return tasks.find(
      (task: Task) => task.name === taskName,
    );
  }
}
