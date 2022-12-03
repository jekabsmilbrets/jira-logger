import { Injectable } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
}                     from '@angular/forms';

import { catchError, lastValueFrom, of, take } from 'rxjs';

import { Tag }          from '@shared/models/tag.model';
import { TasksService } from '@shared/services/tasks.service';

import { CreateTaskFromGroupInterface } from '@task/interfaces/create-task-from-group.interface';


@Injectable()
export class TaskCreateService {

  constructor(
    private tasksService: TasksService,
  ) {
  }

  private static createAsyncValidator(tasksService: TasksService): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> => lastValueFrom(
      tasksService
      .taskExist(control.value)
      .pipe(
        take(1),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        catchError(() => of<ValidationErrors>({'duplicate-task': true})),
      )
    );
  }

  public createFormGroup(): FormGroup<CreateTaskFromGroupInterface> {
    return new FormGroup<CreateTaskFromGroupInterface>(
      {
        name: new FormControl<string | null>(
          null,
          [Validators.required],
          [
            TaskCreateService.createAsyncValidator(this.tasksService),
          ],
        ),
        description: new FormControl<string | null>(null),
        tags: new FormControl<Tag[] | null>([]),
      },
    );
  }
}
