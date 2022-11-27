import { Injectable }                                                            from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';

import { catchError, Observable, of, take } from 'rxjs';

import { Tag }          from '@shared/models/tag.model';
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

  private asyncValidator(
    control: AbstractControl
  ): Observable<ValidationErrors | null> {
    return this.tasksService.taskExist(control.value)
      .pipe(
        take(1),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        catchError(() => of<ValidationErrors>({'duplicate-task': true})),
      );
  }

}
