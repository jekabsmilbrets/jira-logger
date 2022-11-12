import { Injectable }                                                            from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import { catchError, Observable, of, skip, switchMap, take } from 'rxjs';

import { Tag }          from '@shared/models/tag.model';
import { Task }         from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import { CreateTaskFromGroupInterface } from '@task/interfaces/create-task-from-group.interface';


@Injectable()
export class TaskCreateService {

  constructor(
    private tasksService: TasksService,
  ) {
  }

  public createFormGroup(): FormGroup<CreateTaskFromGroupInterface> {
    return new FormGroup<CreateTaskFromGroupInterface>(
      {
        name: new FormControl<string | null>(
          null,
          [Validators.required],
          [
            this.asyncValidator.bind(this),
          ],
        ),
        description: new FormControl<string | null>(null),
        tags: new FormControl<Tag[] | null>([]),
      },
    );
  }

  private asyncValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    const duplicateCheck = (value: string) => (tasks: Task[] | null) => {
      if (
        tasks &&
        tasks.find(
          (task: Task) => task.name === value,
        )
      ) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return of({'duplicate-task': true});
      }

      return of(null);
    };

    return this.tasksService.tasks$
      .pipe(
        skip(1),
        take(1),
        catchError(() => of(null)),
        switchMap(duplicateCheck(control.value)),
      );
  }

}
