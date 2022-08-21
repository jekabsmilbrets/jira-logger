import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Task } from '@shared/models/task.model';

import { TimeLog } from '@shared/models/time-log.model';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';


@Component(
  {
    selector: 'app-task-list',
    templateUrl: './task-list.component.html',
    styleUrls: ['./task-list.component.scss'],
  },
)
export class TaskListComponent {
  @Input()
  public tasks: Task[] | null = [];

  @Input()
  public isLoading!: boolean | null;

  @Output()
  public update: EventEmitter<[Task, TaskUpdateActionEnum]> = new EventEmitter<[Task, TaskUpdateActionEnum]>();

  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();

  @Output()
  public reload: EventEmitter<void> = new EventEmitter<void>();

  @Output()
  public createTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  @Output()
  public updateTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  @Output()
  public removeTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  public onUpdate([task, action]: [Task, TaskUpdateActionEnum]): void {
    this.update.emit(
      [
        task,
        action,
      ],
    );
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }

  public onReload(): void {
    this.reload.emit();
  }

  public onCreateTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.createTimeLog.emit(
      [
        task,
        timeLog,
      ],
    );
  }

  public onUpdateTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.updateTimeLog.emit(
      [
        task,
        timeLog,
      ],
    );
  }

  public onRemoveTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.removeTimeLog.emit(
      [
        task,
        timeLog,
      ],
    );
  }
}
