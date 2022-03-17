import { Component, OnInit }                                   from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';

import { iif, Observable, of, switchMap, take } from 'rxjs';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task }         from '@task/models/task.model';
import { TasksService } from '@task/services/tasks.service';

@Component({
             selector: 'app-tasks-view',
             templateUrl: './tasks-view.component.html',
             styleUrls: ['./tasks-view.component.scss'],
           })
export class TasksViewComponent implements OnInit {
  public tasks$: Observable<Task[]>;

  public createTaskForm: FormGroup = new FormGroup(
    {
      name: new FormControl(
        undefined,
        [Validators.required],
        [
          (control: AbstractControl) => this.tasks$
                                            .pipe(
                                              take(1),
                                              switchMap(
                                                (tasks: Task[]) => {
                                                  const value = control.value;

                                                  if (tasks.find(
                                                    (task) => task.name === value)) {
                                                    return of({'duplicate-task': true});
                                                  }

                                                  return of(null);
                                                },
                                              ),
                                            ),
        ],
      ),
      description: new FormControl(),
      tags: new FormControl([TaskTagsEnum.opex]),
    },
  );

  public tags: { viewValue: string; value: TaskTagsEnum }[] = [
    {
      value: TaskTagsEnum.opex,
      viewValue: 'OPEX',
    },
    {
      value: TaskTagsEnum.capex,
      viewValue: 'CAPEX',
    },
    {
      value: TaskTagsEnum.other,
      viewValue: 'OTHER',
    },
  ];

  constructor(
    private tasksService: TasksService,
  ) {
    this.tasks$ = this.tasksService.tasks$;
  }

  public ngOnInit(): void {
    this.reloadData();
  }

  public createTask(): void {
    const task = new Task(
      {
        name: this.createTaskForm.get('name')?.value,
        description: this.createTaskForm.get('description')?.value,
        tags: this.createTaskForm.get('tags')?.value,
      },
    );

    this.tasksService.create(task)
        .pipe(
          take(1),
        )
        .subscribe(
          () => this.createTaskForm.reset(
            {
              tags: [TaskTagsEnum.opex],
            },
          ),
        );
  }

  public onUpdate(
    [
      task,
      action,
    ]: [
      Task,
      TaskUpdateActionEnum
    ],
  ): void {
    iif(
      () => action === TaskUpdateActionEnum.startWorkLog,
      this.tasksService.stopAllTaskWorkLogs(task)
          .pipe(
            take(1),
          ),
      of(null),
    )
      .pipe(
        switchMap(
          () => this.tasksService.update(task)
                    .pipe(
                      take(1),
                    ),
        ),
      )
      .pipe(
        take(1),
      )
      .subscribe();
  }

  public onRemove(task: Task): void {
    this.tasksService.delete(task)
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public onReload(): void {
    this.reloadData();
  }

  private reloadData(): void {
    this.tasksService.list()
        .pipe(
          take(1),
        )
        .subscribe();
  }
}
