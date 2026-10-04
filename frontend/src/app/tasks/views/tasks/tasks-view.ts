import { ChangeDetectionStrategy, Component, computed, effect, inject, type Signal, signal, type WritableSignal } from '@angular/core';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';

import { catchError, of, take } from 'rxjs';

import { Storage } from '@core/services/storage';

import { Task as TaskModel } from '@shared/models/task.model';
import { Tasks } from '@shared/services/tasks';

import { Task } from '@tasks/components/task-list/task/task';
import { TaskViewHeader } from '@tasks/components/task-view-header/task-view-header';
import { WorkLog } from '@tasks/services/work-log';

@Component({
  selector: 'tasks-view',
  templateUrl: './tasks-view.html',
  styleUrls: ['./tasks-view.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatPaginatorModule,
    TaskViewHeader,
    Task,
  ],
})
export class TasksView {
  private readonly pageSizeStorageKey: IDBValidKey = 'tasks-view-page-size:v1';
  private readonly settingsStoreName: string = 'settings';
  private readonly storageService: Storage = inject(Storage);
  private readonly tasksService: Tasks = inject(Tasks);
  private readonly workLogService: WorkLog = inject(WorkLog);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly tasks: Signal<TaskModel[]> = this.tasksService.recentTasks;
  protected readonly pageIndex: WritableSignal<number> = signal(0);
  protected readonly pageSizeOptions: number[] = [5, 10, 25, 50];
  protected readonly pageSize: WritableSignal<number> = signal(this.pageSizeOptions[0]);
  private readonly editingTasks: WritableSignal<TaskModel[]> = signal([]);
  protected readonly pagedTasks: Signal<TaskModel[]> = computed(() => {
    const start: number = this.pageIndex() * this.pageSize();

    const tasks: TaskModel[] = this.tasks();
    const pageTasks: TaskModel[] = tasks.slice(start, start + this.pageSize());
    const editingTasks: TaskModel[] = this.editingTasks()
      .filter((editingTask: TaskModel) => !pageTasks.some((task: TaskModel) => task.id === editingTask.id))
      .map((editingTask: TaskModel) => tasks.find((task: TaskModel) => task.id === editingTask.id) ?? editingTask);

    // Keep open editors mounted even if refreshed timer order moves them to another page.
    return [...pageTasks, ...editingTasks];
  });

  public constructor() {
    effect(() => {
      const lastPageIndex: number = Math.max(0, Math.ceil(this.tasks().length / this.pageSize()) - 1);
      this.pageIndex.update((pageIndex: number) => Math.min(pageIndex, lastPageIndex));
    });

    this.storageService.read<unknown>(this.pageSizeStorageKey, this.settingsStoreName)
      .pipe(
        take(1),
        catchError(() => of(undefined)),
      )
      .subscribe((storedPageSize: unknown) => {
        this.pageSize.set(this.normalizePageSize(storedPageSize));
      });
  }

  protected onEditingChange(task: TaskModel, editing: boolean): void {
    this.editingTasks.update((tasks: TaskModel[]) => editing ?
      [...tasks.filter((item: TaskModel) => item.id !== task.id), task] :
      tasks.filter((item: TaskModel) => item.id !== task.id),
    );
  }

  protected onPageChange(
    event: PageEvent,
  ): void {
    const pageSizeChanged: boolean = event.pageSize !== this.pageSize();

    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);

    if (pageSizeChanged) {
      this.storageService.create(this.pageSizeStorageKey, event.pageSize, this.settingsStoreName)
        .pipe(
          take(1),
          catchError(() => of(undefined)),
        )
        .subscribe();
    }
  }

  protected onAction(
    task: TaskModel,
  ): void {
    this.workLogService.toggleTaskWorkLog(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onUpdate(
    task: TaskModel,
  ): void {
    this.tasksService.update(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onRemove(
    task: TaskModel,
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

  private normalizePageSize(
    pageSize: unknown,
  ): number {
    return typeof pageSize === 'number' && this.pageSizeOptions.includes(pageSize) ?
      pageSize :
      this.pageSizeOptions[0];
  }
}
