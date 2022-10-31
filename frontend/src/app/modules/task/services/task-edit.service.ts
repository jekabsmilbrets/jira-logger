import { Injectable }                                          from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';

import { Observable, of, switchMap, take } from 'rxjs';

import { Tag }          from '@shared/models/tag.model';
import { Task }         from '@shared/models/task.model';
import { TagsService }  from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';


@Injectable()
export class TaskEditService {
  public tasks$: Observable<Task[]>;
  public tags$: Observable<Tag[]>;

  constructor(
    private tasksService: TasksService,
    private tagsService: TagsService,
  ) {
    this.tasks$ = this.tasksService.tasks$;
    this.tags$ = this.tagsService.tags$;
  }

  public createFormGroup(
    task: Task,
  ): FormGroup {
    const formGroup = new FormGroup<{
      name: FormControl<string | null>;
      description: FormControl<string | null>;
      tags: FormControl<Tag[] | null>;
    }>(
      {
        name: new FormControl<string | null>(
          null,
          [Validators.required],
          [
            this.asyncValidator(task),
          ],
        ),
        description: new FormControl<string | null>(null),
        tags: new FormControl<Tag[]>([]),
      },
    );

    formGroup.patchValue(
      {
        name: task.name,
        description: task.description,
        tags: task.tags,
      },
    );

    return formGroup;
  }

  private asyncValidator = (currentTask: Task) => (control: AbstractControl) => {
    const switchMapFn = (tasks: Task[]) => {
      const value = control.value;

      if (
        tasks.find(
          (task: Task) => task.name === value && currentTask.id !== task.id,
        )
      ) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return of({'duplicate-task': true});
      }

      return of(null);
    };

    return this.tasks$
               .pipe(
                 take(1),
                 switchMap(switchMapFn),
               );
  };
}
