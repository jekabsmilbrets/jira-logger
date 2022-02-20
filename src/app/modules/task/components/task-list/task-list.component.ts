import { Component, Input, Output, EventEmitter } from '@angular/core';

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
  public update: EventEmitter<Task> = new EventEmitter<Task>();

  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();

  public onUpdate(task: Task): void {
    this.update.emit(task);
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }
}
