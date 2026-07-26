import { ChangeDetectionStrategy, Component, computed, effect, inject, type Signal, signal, type WritableSignal } from '@angular/core';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';

import { catchError, of, take } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

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
    MatPaginatorModule,
    TaskViewHeaderComponent,
    TaskComponent,
  ],
})
export class TasksViewComponent {
  private readonly pageSizeStorageKey: IDBValidKey = 'tasks-view-page-size:v1';
  private readonly settingsStoreName: string = 'settings';
  private readonly storageService: StorageService = inject(StorageService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly workLogService: WorkLogService = inject(WorkLogService);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly tasks: Signal<Task[]> = this.tasksService.recentTasks;
  protected readonly pageIndex: WritableSignal<number> = signal(0);
  protected readonly pageSizeOptions: number[] = [5, 10, 25, 50];
  protected readonly pageSize: WritableSignal<number> = signal(this.pageSizeOptions[0]);
  protected readonly pagedTasks: Signal<Task[]> = computed(() => {
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

  private normalizePageSize(
    pageSize: unknown,
  ): number {
    return typeof pageSize === 'number' && this.pageSizeOptions.includes(pageSize) ?
      pageSize :
      this.pageSizeOptions[0];
  }
}
