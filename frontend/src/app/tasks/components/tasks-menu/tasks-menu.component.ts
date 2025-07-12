import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import { CreateTaskFromGroupInterface } from '@tasks/interfaces/create-task-from-group.interface';
import { TaskCreateService } from '@tasks/services/task-create.service';

import { TaskImportService } from '@tasks/services/task-import.service';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';

import { catchError, debounceTime, distinctUntilChanged, Observable, of, startWith, switchMap, take } from 'rxjs';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.component.html',
  styleUrls: ['./tasks-menu.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TasksSettingsToggleComponent,
    MatButtonModule,
    CommonModule,
    MatInputModule,
  ],
})
export class TasksMenuComponent {
  protected tags$: Observable<Tag[]>;
  protected isLoading$: Observable<boolean>;

  protected createTaskForm: FormGroup<CreateTaskFromGroupInterface>;

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly tasksSettingsService: TasksSettingsService = inject(TasksSettingsService);
  private readonly taskImportService: TaskImportService = inject(TaskImportService);
  private readonly taskCreateService: TaskCreateService = inject(TaskCreateService);
  private readonly tagsService: TagsService = inject(TagsService);

  constructor() {
    this.isLoading$ = this.tasksService.isLoading$;
    this.tags$ = this.tagsService.tags$;
    this.createTaskForm = this.taskCreateService.createFormGroup();

    this.createTaskForm.get('name')?.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value: string | null) => {
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

  protected onCreate(): void {
    const task: Task = new Task(this.createTaskForm.getRawValue() as Partial<Task>);

    this.tasksService.create(task)
      .pipe(take(1))
      .subscribe(() => this.resetFormGroup());
  }

  private resetFormGroup(): void {
    this.createTaskForm.reset({
      tags: [],
    });
  }
}
