import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';

import { take } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import { TaskComponent } from '@tasks/components/task-list/task/task.component';
import { TaskViewHeaderComponent } from '@tasks/components/task-view-header/task-view-header.component';
import { WorkLogService } from '@tasks/services/work-log.service';

@Component({
  selector: 'tasks-view',
  templateUrl: './tasks-view.component.html',
  styleUrls: ['./tasks-view.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TaskViewHeaderComponent,
    TaskComponent,
  ],
})
export class TasksViewComponent {
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly workLogService: WorkLogService = inject(WorkLogService);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly tasks: Signal<Task[]> = this.tasksService.recentTasks;

  protected onAction(
    task: Task,
  ): void {
    this.workLogService.toggleTaskWorkLog(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onUpdate(
    task: Task,
  ): void {
    this.tasksService.update(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onRemove(
    task: Task,
  ): void {
    this.tasksService.delete(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onTimeLogsSaved(): void {
    this.tasksService.list()
      .pipe(take(1))
      .subscribe();
  }
}
