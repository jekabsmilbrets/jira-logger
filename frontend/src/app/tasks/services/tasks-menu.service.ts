import { computed, inject, Injector, type ResourceRef, runInInjectionContext, Service, type Signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { type FieldTree } from '@angular/forms/signals';

import { catchError, debounceTime, of, take } from 'rxjs';

import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import type { TaskImportOutcome, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { TaskFormValue } from '@tasks/interfaces/task-form-value.interface';
import { TaskBackupService } from '@tasks/services/task-backup.service';
import { buildEmptyTaskFormValue, buildTaskCreatePayload, setTaskFormTags } from '@tasks/utility/task-form-intent.utility';

@Service()
export class TasksMenuService {
  private readonly injector: Injector = inject(Injector);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly taskBackupService: TaskBackupService = inject(TaskBackupService);

  public createTaskRefresh(
    filterName: Signal<string>,
  ): Signal<Task[] | null> {
    return runInInjectionContext(this.injector, () => {
      const debouncedTaskFilterName: Signal<string> = toSignal(
        toObservable(filterName).pipe(debounceTime(300)),
        { initialValue: filterName() },
      );
      const taskFilterRefresh: ResourceRef<Task[] | null | undefined> = rxResource<Task[] | null, string>({
        params: debouncedTaskFilterName,
        stream: ({ params }) => {
          const filter: TaskListFilter = {};

          if (params) {
            filter.name = params;
          }

          return this.tasksService.loadVisibleTasks(filter)
            .pipe(
              take(1),
              catchError(() => of(null)),
            );
        },
      });

      return computed(() => taskFilterRefresh.value() ?? null);
    });
  }

  public createTask(form: FieldTree<TaskFormValue>, model: Signal<TaskFormValue>): void {
    if (!form().valid()) {
      form().markAsTouched();
      return;
    }

    this.tasksService.create(buildTaskCreatePayload(model()))
      .pipe(take(1))
      .subscribe(() => form().reset(buildEmptyTaskFormValue()));
  }

  public updateTags(form: FieldTree<TaskFormValue>, tags: Tag[]): void {
    setTaskFormTags(form.tags(), tags);
  }

  public importTasks(
    result: TaskImportRequest | undefined,
    showReport: (message: string, duration: number) => void,
  ): void {
    if (!result) {
      return;
    }

    this.taskBackupService.applyTaskBackupForUser(result)
      .pipe(take(1))
      .subscribe({
        next: (outcome: TaskImportOutcome) => {
          showReport(
            outcome.message,
            outcome.duration,
          );
        },
      });
  }
}
