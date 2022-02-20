import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable, tap, switchMap, of, map, take } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

import { TaskInterface } from '@task/interfaces/task.interface';
import { Task } from '@task/models/task.model';

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
                       ([, taskData]: [string, TaskInterface]) => new Task(taskData),
                     )
                     .sort(
                       (a: Task, b: Task) => a.createDate.getTime() < b.createDate.getTime() ? 1 : -1,
                     ),
                 ),
                 tap((tasks: Task[]) => console.log(tasks)),
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
                 take(1),
                 switchMap(
                   () => this.list().pipe(take(1)),
                 ),
                 switchMap(() => of(undefined)),
               );
  }

  private findTask(tasks: Task[], taskName: string): Task | undefined {
    return tasks.find(
      (task: Task) => task.name === taskName,
    );
  }
}
