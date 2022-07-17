import { Component, OnInit }                                   from '@angular/core';
import { AbstractControl, Validators, FormGroup, FormControl } from '@angular/forms';

import { iif, Observable, of, switchMap, take } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { SharedModule } from '@shared/shared.module';

import { TasksMenuComponent } from '@task/components/tasks-menu/tasks-menu.component';

import { defaultSelectTags } from '@task/constants/default-tags.constants';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task }                 from '@task/models/task.model';
import { TimeLog }              from '@task/models/time-log.model';
import { TasksSettingsService } from '@task/services/tasks-settings.service';
import { TasksService }         from '@task/services/tasks.service';


@Component({
             selector: 'app-tasks-view',
             templateUrl: './tasks-view.component.html',
             styleUrls: ['./tasks-view.component.scss'],
           })
export class TasksViewComponent implements OnInit {
  public tasks$: Observable<Task[]>;
  public isLoading$: Observable<boolean>;

  public createTaskForm: FormGroup<{
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    tags: FormControl<TaskTagsEnum[] | null>;
  }> = new FormGroup<{
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    tags: FormControl<TaskTagsEnum[] | null>;
  }>(
    {
      name: new FormControl<string | null>(
        null,
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
                                                    // eslint-disable-next-line @typescript-eslint/naming-convention
                                                    return of({'duplicate-task': true});
                                                  }

                                                  return of(null);
                                                },
                                              ),
                                            ),
        ],
      ),
      description: new FormControl<string | null>(null),
      tags: new FormControl<TaskTagsEnum[] | null>([TaskTagsEnum.capex]),
    },
  );

  public tags: { viewValue: string; value: TaskTagsEnum }[] = defaultSelectTags;

  constructor(
    private tasksService: TasksService,
    private tasksSettingsService: TasksSettingsService,
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
      this.createTaskForm.getRawValue() as Partial<Task>,
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
            {
              provide: TasksSettingsService,
              useValue: this.tasksSettingsService,
            },
            SharedModule,
          ],
        },
      ),
    );
  }
}
