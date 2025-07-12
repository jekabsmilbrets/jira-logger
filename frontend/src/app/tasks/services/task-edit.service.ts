import { inject, Injectable } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TaskFormGroup } from '@tasks/interfaces/task-form-group.interface';

import { Observable, of, switchMap, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskEditService {
  public tasks$: Observable<Task[]>;
  public tags$: Observable<Tag[]>;

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly tagsService: TagsService = inject(TagsService);

  constructor() {
    this.tasks$ = this.tasksService.tasks$;
    this.tags$ = this.tagsService.tags$;
  }

  public createFormGroup(
    task: Task,
  ): FormGroup {
    const formGroup: FormGroup<TaskFormGroup> = new FormGroup<TaskFormGroup>({
      name: new FormControl<string | null>(
        null,
        [
          Validators.required,
        ],
        [
          this.asyncValidator(task),
        ],
      ),
      description: new FormControl<string | null>(null),
      tags: new FormControl<Tag[]>([]),
    });

    formGroup.patchValue({
      name: task.name,
      description: task.description,
      tags: task.tags,
    });

    return formGroup;
  }

  private asyncValidator: (currentTask: Task) => (control: AbstractControl) => Observable<null | ValidationErrors> = (
    currentTask: Task,
  ) => (
    control: AbstractControl,
  ) => {
    const switchMapFn: (tasks: Task[]) => Observable<ValidationErrors | null> = (
      tasks: Task[],
    ): Observable<ValidationErrors | null> => {
      const value: string = control.value;

      if (tasks.find(
        (task: Task) => task.name === value && currentTask.id !== task.id,
      )) {
        return of({ 'duplicate-task': true });
      }

      return of(null);
    };

    return this.tasks$.pipe(
      take(1),
      switchMap(switchMapFn),
    );
  };
}
