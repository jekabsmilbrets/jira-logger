import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { BehaviorSubject, Observable, tap, switchMap, take, map, of } from 'rxjs';
import { Task } from 'src/app/models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  public tasks$: Observable<Task[]>;

  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject<Task[]>([]);
  private storeName = 'task';

  constructor(
    private storage: StorageService,
  ) {
    this.tasks$ = this.tasksSubject.asObservable();
  }

  public getTasks(): Observable<Task[]> {
    return this.storage.listAll(this.storeName)
               .pipe(
                 tap((tasks) => this.tasksSubject.next(tasks)),
               );
  }

  public update(task: Task): Observable<Task> {
    return this.storage.update(task.name, task, this.storeName)
               .pipe(
                 switchMap(
                   () => this.getTasks()
                 ),
                 map(
                   (tasks: Task[]) => tasks.find(
                     (nTask: Task) => nTask.name === task.name
                   ) as Task
                 ),
               );
  }

  public create(task: Task): Observable<Task> {
    return this.storage.create(task.name, task, this.storeName)
               .pipe(
                 switchMap(
                   () => this.getTasks()
                 ),
                 map(
                   (tasks: Task[]) => tasks.find(
                     (nTask: Task) => nTask.name === task.name
                   ) as Task
                 ),
               );
  }

  public delete(task: Task): Observable<void> {
    return this.storage.delete(task.name, this.storeName)
               .pipe(
                 switchMap(
                   () => this.getTasks()
                 ),
                 switchMap(
                   () => of()
                 )
               )
  }
}
