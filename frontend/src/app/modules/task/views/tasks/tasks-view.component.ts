import { Component, OnInit }                                   from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';

import { concat, Observable, of, switchMap, take } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { Tag } from '@shared/models/tag.model';

import { Task }            from '@shared/models/task.model';
import { TimeLog }         from '@shared/models/time-log.model';
import { TagsService }     from '@shared/services/tags.service';
import { TasksService }    from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { SharedModule } from '@shared/shared.module';

import { TasksMenuComponent } from '@task/components/tasks-menu/tasks-menu.component';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';
import { TasksSettingsService } from '@task/services/tasks-settings.service';


@Component(
  {
    selector: 'app-tasks-view',
    templateUrl: './tasks-view.component.html',
    styleUrls: ['./tasks-view.component.scss'],
  },
)
export class TasksViewComponent implements OnInit {
  public tasks$: Observable<Task[]>;
  public isLoading$: Observable<boolean>;

  public createTaskForm: FormGroup<{
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    tags: FormControl<Tag[] | null>;
  }> = new FormGroup<{
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    tags: FormControl<Tag[] | null>;
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
      tags: new FormControl<Tag[] | null>([]),
    },
  );

  public tags$: Observable<Tag[]>;

  constructor(
    private tasksService: TasksService,
    private timeLogsService: TimeLogsService,
    private tasksSettingsService: TasksSettingsService,
    private dynamicMenuService: DynamicMenuService,
    private tagsService: TagsService,
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
    this.tags$ = this.tagsService.tags$;
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
              tags: [],
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
    this.tasks$
        .pipe(
          take(1),
          switchMap(
            (tasks: Task[]) => {
              const observables = [];

              if (TaskUpdateActionEnum.startWorkLog === action) {
                tasks.forEach(
                  (t: Task) => {
                    if (t.id !== task.id) {
                      if (t.lastTimeLog && !t.lastTimeLog.endTime) {
                        t.lastTimeLog.endTime = new Date();
                        observables.push(this.timeLogsService.update(t, t.lastTimeLog));
                      }
                    }
                  },
                );
              }

              observables.push(this.tasksService.update(task));

              return concat(...observables)
                .pipe(
                  take(observables.length),
                );
            },
          ),
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

  public onCreateTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.timeLogsService.create(task, timeLog)
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public onUpdateTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.timeLogsService.update(task, timeLog)
        .pipe(
          take(1),
        )
        .subscribe();
  }

  public onRemoveTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.timeLogsService.delete(task, timeLog)
        .pipe(
          take(1),
        )
        .subscribe();
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
