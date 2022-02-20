import { Component, OnInit } from '@angular/core';

import { Observable, take, of, iif, switchMap } from 'rxjs';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task } from '@task/models/task.model';
import { TasksService } from '@task/services/tasks.service';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  public tasks$: Observable<Task[]>;

  constructor(
    private tasksService: TasksService,
  ) {
    this.tasks$ = this.tasksService.tasks$;
  }

  public ngOnInit(): void {
    this.tasksService.list()
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public createTask(): void {
    const task = new Task({
      name: 'MTET-' + (Math.floor(Math.random() * 10000) + 10000).toString().substring(1),
    });

    task.startTimeLog('test');
    task.stopTimeLog();

    this.tasksService.create(task)
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public onUpdate([task, action]: [Task, TaskUpdateActionEnum]): void {
    iif(
      () => action === TaskUpdateActionEnum.startWorkLog,
      this.tasksService.stopAllTaskWorkLogs(task)
          .pipe(
            take(1),
          ),
      of(null),
    )
      .pipe(
        switchMap(
          () => this.tasksService.update(task)
                    .pipe(
                      take(1),
                    ),
        ),
      )
      .pipe(
        take(1),
      )
      .subscribe();
  }

  public onRemove(task: Task): void {
    this.tasksService.delete(task)
        .pipe(
          take(1),
        )
        .subscribe();
  }
}
