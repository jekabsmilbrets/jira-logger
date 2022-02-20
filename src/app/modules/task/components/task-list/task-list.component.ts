import { Component, Input, Output, EventEmitter } from '@angular/core';

import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
})
export class TaskListComponent {
  @Input()
  public tasks: Task[] | null = [];

  @Output()
  public edit: EventEmitter<Task> = new EventEmitter<Task>();

  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();

  @Output()
  public startTime: EventEmitter<Task> = new EventEmitter<Task>();

  public onEdit(task: Task): void {
    this.edit.emit(task);
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }

  public onStartTime(task: Task): void {
    this.startTime.emit(task);
  }
}
