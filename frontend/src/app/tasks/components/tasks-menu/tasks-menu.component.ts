import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { form, FormField, required, validateAsync } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, startWith, switchMap, take } from 'rxjs';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import { CreateTaskFormValue } from '@tasks/interfaces/create-task-form-value.interface';
import { TaskImportService } from '@tasks/services/task-import.service';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.component.html',
  styleUrls: ['./tasks-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TasksSettingsToggleComponent,
    MatButtonModule,
    MatInputModule,
    AsyncPipe,
    FormField,
  ],
})
export class TasksMenuComponent {
  protected tags$: Observable<Tag[]>;
  protected isLoading$: Observable<boolean>;
  protected readonly createTaskFormModel = signal<CreateTaskFormValue>({
    name: '',
    description: '',
    tags: [],
  });
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

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly tasksSettingsService: TasksSettingsService = inject(TasksSettingsService);
  private readonly taskImportService: TaskImportService = inject(TaskImportService);
  private readonly tagsService: TagsService = inject(TagsService);

  constructor() {
    this.isLoading$ = this.tasksService.isLoading$;
    this.tags$ = this.tagsService.tags$;

    toObservable(this.createTaskForm.name().value)
      .pipe(
        startWith(this.createTaskFormModel().name),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value: string) => {
          const filter: TaskListFilter = {};

          if (value) {
            filter.name = value;
          }

          return this.tasksService.filteredList(
            filter,
            true,
          )
            .pipe(
              take(1),
              catchError(() => of(null)),
            );
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected onOpenSettingsDialog(): void {
    this.tasksService.tasks$
      .pipe(
        take(1),
        switchMap((tasks: Task[]) => this.tasksSettingsService.openDialog(tasks)),
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
