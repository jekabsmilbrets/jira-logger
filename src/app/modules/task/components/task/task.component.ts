import { Component, Input, EventEmitter, Output } from '@angular/core';

import { Task } from '@task/models/task.model';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
})
export class TaskComponent {
  @Input() task!: Task;

  @Output() update: EventEmitter<Task> = new EventEmitter<Task>();
  @Output() remove: EventEmitter<Task> = new EventEmitter<Task>();

  public onUpdate(task: Task): void {
    this.update.emit(task);
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }

  public onToggleTimeLog(task: Task): void {
    if (!task.lastTimeLogId) {
      task.startTimeLog();
    } else {
      task.stopTimeLog();
    }

    this.update.emit(task);
  }
}
