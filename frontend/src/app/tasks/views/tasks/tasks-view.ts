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
  protected readonly pagedTasks: Signal<TaskModel[]> = computed(() => {
    const start: number = this.pageIndex() * this.pageSize();

    return this.tasks().slice(start, start + this.pageSize());
  });

  public constructor() {
    effect(() => {
      this.tasks();
      this.pageIndex.set(0);
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
