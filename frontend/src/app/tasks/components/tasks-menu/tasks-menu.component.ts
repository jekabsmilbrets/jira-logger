import { ChangeDetectionStrategy, Component, computed, inject, injectAsync, Signal, signal, WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, required, validateAsync } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { catchError, map, of, switchMap, take } from 'rxjs';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import { CreateTaskFormValue } from '@tasks/interfaces/create-task-form-value.interface';
import { TaskImportService } from '@tasks/services/task-import.service';
import { TasksMenuFilterService } from '@tasks/services/tasks-menu-filter.service';
import type { TasksSettingsService } from '@tasks/services/tasks-settings.service';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.component.html',
  styleUrls: ['./tasks-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TasksMenuFilterService],
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TasksSettingsToggleComponent,
    MatButtonModule,
    MatInputModule,
    FormField,
  ],
})
export class TasksMenuComponent {
  protected readonly createTaskFormModel: WritableSignal<CreateTaskFormValue> = signal<CreateTaskFormValue>({
    name: '',
    description: '',
    tags: [],
  });

  private readonly tasksService: TasksService = inject(TasksService);

  protected readonly createTaskForm = form(this.createTaskFormModel, (path) => {
    required(path.name, { message: 'Task name is required.' });
    validateAsync(path.name, {
      params: ({ value }) => {
        const name: string = value().trim();
        return name ? name : undefined;
      },
      debounce: 300,
      factory: (name) => rxResource({
        params: name,
        stream: ({ params }) => {
          if (!params) {
            return of(false);
          }

          return this.tasksService.taskExist(params).pipe(
            map(() => false),
            catchError(() => of(true)),
          );
        },
      }),
      onSuccess: (isDuplicate) => isDuplicate ? {
        kind: 'duplicate-task',
        message: 'Task already exists.',
      } : null,
      onError: () => ({
        kind: 'duplicate-task',
        message: 'Task already exists.',
      }),
    });
  });

  private readonly loadTasksSettingsService = injectAsync(
    () => import('@tasks/services/tasks-settings.service').then((m) => m.TasksSettingsService),
  );
  private readonly taskImportService: TaskImportService = inject(TaskImportService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksMenuFilterService: TasksMenuFilterService = inject(TasksMenuFilterService);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;

  private readonly taskFilterName = computed(() => this.createTaskForm.name().value().trim());
  private readonly taskFilterRefresh = this.tasksMenuFilterService.createTaskRefresh(this.taskFilterName);

  constructor() {
    this.taskFilterRefresh();
  }

  protected async onOpenSettingsDialog(): Promise<void> {
    const tasksSettingsService: TasksSettingsService = await this.loadTasksSettingsService();

    tasksSettingsService.openDialog(this.tasksService.tasks())
      .pipe(
        take(1),
        switchMap((result: ApiTask[] | undefined) => result ?
          this.taskImportService.importData(result)
            .pipe(
              take(1),
              switchMap(() => this.tasksService.list()),
              take(1),
            ) :
          of(false),
        ),
      )
      .subscribe();
  }

  protected onTagsChange(tags: Tag[]): void {
    const field: ReturnType<typeof this.createTaskForm.tags> = this.createTaskForm.tags();
    field.value.set(tags);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
  }

  protected isSameTag(tag1: Tag, tag2: Tag): boolean {
    return tag1.id === tag2.id;
  }

  protected onCreate(event?: Event): void {
    event?.preventDefault?.();

    if (!this.createTaskForm().valid()) {
      this.createTaskForm().markAsTouched();
      return;
    }

    const task: Task = new Task(this.createTaskFormModel() as Partial<Task>);

    this.tasksService.create(task)
      .pipe(take(1))
      .subscribe(() => this.resetForm());
  }

  private resetForm(): void {
    this.createTaskForm().reset({
      name: '',
      description: '',
      tags: [],
    });
  }
}
