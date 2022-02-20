import { Component, Input, EventEmitter, Output } from '@angular/core';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task } from '@task/models/task.model';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
})
export class TaskComponent {
  @Input() task!: Task;

  @Output() update: EventEmitter<[Task, TaskUpdateActionEnum]> = new EventEmitter<[Task, TaskUpdateActionEnum]>();
  @Output() remove: EventEmitter<Task> = new EventEmitter<Task>();

  public onUpdate(task: Task): void {
    this.update.emit([
      task,
      TaskUpdateActionEnum.update,
    ]);
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }

  public onToggleTimeLog(task: Task): void {
    let action: TaskUpdateActionEnum;
    if (!task.lastTimeLogId) {
      task.startTimeLog();
      action = TaskUpdateActionEnum.startWorkLog;
    } else {
      task.stopTimeLog();
      action = TaskUpdateActionEnum.stopWorkLog;
    }

    this.update.emit([
      task,
      action,
    ]);
  }
}
