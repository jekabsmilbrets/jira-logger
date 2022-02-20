import { Component, Input, EventEmitter, Output } from '@angular/core';

import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
})
export class TaskComponent {
  @Input() task!: Task;

  @Output() edit: EventEmitter<Task> = new EventEmitter<Task>();
  @Output() remove: EventEmitter<Task> = new EventEmitter<Task>();
  @Output() startTime: EventEmitter<Task> = new EventEmitter<Task>();

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
