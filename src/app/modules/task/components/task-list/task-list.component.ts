import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task } from '@task/models/task.model';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
})
export class TaskListComponent {
  @Input()
  public tasks: Task[] | null = [];

  @Output()
  public update: EventEmitter<[Task, TaskUpdateActionEnum]> = new EventEmitter<[Task, TaskUpdateActionEnum]>();

  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();

  public onUpdate([task, action]: [Task, TaskUpdateActionEnum]): void {
    this.update.emit([
      task,
      action,
    ]);
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }
}
