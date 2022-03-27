import { Component, OnInit }                                   from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';

import { iif, Observable, of, switchMap, take } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { SharedModule } from '@shared/shared.module';

import { TasksMenuComponent } from '@task/components/tasks-menu/tasks-menu.component';

import { defaultSelectTags } from '@task/constants/default-tags.constants';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task }         from '@task/models/task.model';
import { TimeLog }      from '@task/models/time-log.model';
import { TasksService } from '@task/services/tasks.service';

@Component({
             selector: 'app-tasks-view',
             templateUrl: './tasks-view.component.html',
             styleUrls: ['./tasks-view.component.scss'],
           })
export class TasksViewComponent implements OnInit {
  public tasks$: Observable<Task[]>;
  public isLoading$: Observable<boolean>;

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
      tags: new FormControl([TaskTagsEnum.capex]),
    },
  );

  public tags: { viewValue: string; value: TaskTagsEnum }[] = defaultSelectTags;

  constructor(
    private tasksService: TasksService,
    private dynamicMenuService: DynamicMenuService,
  ) {
    this.isLoading$ = this.tasksService.isLoading$;
    this.tasks$ = this.tasksService.tasks$
                      .pipe(
                        switchMap(
                          (tasks: Task[]) => of(
                            [...tasks].sort(
                              this.taskSort,
                            ),
                          ),
                        ),
                      );
  }

  public ngOnInit(): void {
    this.createDynamicMenu();
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
      () => TaskUpdateActionEnum.startWorkLog === action,
      this.tasksService.stopAllTaskWorkLogs(task)
          .pipe(take(1)),
      of(null),
    )
      .pipe(
        switchMap(() => this.tasksService.update(task)),
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

  private taskSort(a: Task, b: Task): number {
    const mapDateTime = (timeLogs: TimeLog[]): number[] => timeLogs
      .map(
        (l: TimeLog) => l.startTime.getTime(),
      );

    const aLastTimeLog = Math.max(...mapDateTime(a.timeLogs), -1);
    const bLastTimeLog = Math.max(...mapDateTime(b.timeLogs), -1);

    return bLastTimeLog - aLastTimeLog;
  }

  private reloadData(): void {
    this.tasksService.list()
        .pipe(
          take(1),
        )
        .subscribe();
  }

  private createDynamicMenu(): void {
    this.dynamicMenuService.addDynamicMenu(
      new DynamicMenu(
        TasksMenuComponent,
        {
          route: '/tasks',
          providers: [
            {
              provide: TasksService,
              useValue: this.tasksService,
            },
            SharedModule,
          ],
        },
      ),
    );
  }
}
