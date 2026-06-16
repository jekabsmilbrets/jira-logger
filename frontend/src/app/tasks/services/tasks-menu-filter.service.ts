import { computed, inject, Injector, type ResourceRef, runInInjectionContext, Service, type Signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { catchError, debounceTime, of, take } from 'rxjs';

import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

@Service()
export class TasksMenuFilterService {
  private readonly injector: Injector = inject(Injector);
  private readonly tasksService: TasksService = inject(TasksService);

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

          return this.tasksService.filteredList(
            filter,
            true,
          )
            .pipe(
              take(1),
              catchError(() => of(null)),
            );
        },
      });

      return computed(() => taskFilterRefresh.value() ?? null);
    });
  }
}
