import { Component, OnInit } from '@angular/core';
import { FormGroup }         from '@angular/forms';

import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, startWith, switchMap, take } from 'rxjs';

import { DynamicMenu }        from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';

import { TaskListFilter }  from '@shared/interfaces/task-list-filter.interface';
import { Tag }             from '@shared/models/tag.model';
import { Task }            from '@shared/models/task.model';
import { TimeLog }         from '@shared/models/time-log.model';
import { TagsService }     from '@shared/services/tags.service';
import { TasksService }    from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';
import { SharedModule }    from '@shared/shared.module';

import { TasksMenuComponent }           from '@tasks/components/tasks-menu/tasks-menu.component';
import { TaskUpdateActionEnum }         from '@tasks/enums/task-update-action.enum';
import { CreateTaskFromGroupInterface } from '@tasks/interfaces/create-task-from-group.interface';
import { TaskCreateService }            from '@tasks/services/task-create.service';
import { TasksSettingsService }         from '@tasks/services/tasks-settings.service';


@Component(
  {
    selector: 'tasks-view',
    templateUrl: './tasks-view.component.html',
    styleUrls: ['./tasks-view.component.scss'],
  },
)
export class TasksViewComponent implements OnInit {
  public tasks$: Observable<Task[]>;
  public isLoading$: Observable<boolean>;
  public tags$: Observable<Tag[]>;

  public createTaskForm: FormGroup<CreateTaskFromGroupInterface>;

  constructor(
    private tasksService: TasksService,
    private taskCreateService: TaskCreateService,
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
    this.createTaskForm = this.taskCreateService.createFormGroup();

    this.createTaskForm.get('name')?.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(
          (value: string | null) => {
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
          },
        ),
      )
      .subscribe();
  }

  public resetFormGroup(): void {
    this.createTaskForm.reset(
      {
        tags: [],
      },
    );
  }

  public onCreate(): void {
    const task = new Task(
      this.createTaskForm.getRawValue() as Partial<Task>,
    );

    this.tasksService.create(task)
      .pipe(
        take(1),
      )
      .subscribe(
        () => this.resetFormGroup(),
      );
  }

  public ngOnInit(): void {
    this.createDynamicMenu();
  }

  public onAction([task, action]: [Task, TaskUpdateActionEnum]): void {
    let action$: Observable<boolean> = of(false);
    switch (action) {
      case TaskUpdateActionEnum.startWorkLog:
        action$ = this.startTimeLog(task);
        break;

      case TaskUpdateActionEnum.stopWorkLog:
        if (task.isTimeLogRunning && task.lastTimeLog instanceof TimeLog) {
          action$ = this.stopTimeLog(task);
        }
        break;

      default:
        break;
    }

    action$
      .pipe(
        take(1),
        switchMap(() => this.tasksService.list()),
        take(1),
      )
      .subscribe();
  }

  public onUpdate(task: Task): void {
    this.tasksService.update(task)
      .pipe(take(1))
      .subscribe();
  }

  public onRemove(task: Task): void {
    this.tasksService.delete(task)
      .pipe(take(1))
      .subscribe();
  }

  public onCreateTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.timeLogsService.create(task, timeLog)
      .pipe(
        take(1),
        switchMap(() => this.tasksService.list()),
        take(1),
      )
      .subscribe();
  }

  public onUpdateTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.timeLogsService.update(task, timeLog)
      .pipe(
        take(1),
        switchMap(() => this.tasksService.list()),
        take(1),
      )
      .subscribe();
  }

  public onRemoveTimeLog([task, timeLog]: [Task, TimeLog]): void {
    this.timeLogsService.delete(task, timeLog)
      .pipe(
        take(1),
        switchMap(() => this.tasksService.list()),
        take(1),
      )
      .subscribe();
  }

  private startTimeLog(
    task: Task,
  ): Observable<boolean> {
    return this.timeLogsService.start(task)
      .pipe(
        take(1),
        map(() => true),
      );
  }

  private stopTimeLog(
    task: Task,
  ): Observable<boolean> {
    return this.timeLogsService.stop(task)
      .pipe(
        take(1),
        map(() => true),
      );
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

  private taskSort(a: Task, b: Task): number {
    const mapDateTime = (timeLogs: TimeLog[]): number[] => timeLogs
      .map(
        (l: TimeLog) => l.startTime.getTime(),
      );

    const aLastTimeLog = Math.max(...mapDateTime(a.timeLogs), -1);
    const bLastTimeLog = Math.max(...mapDateTime(b.timeLogs), -1);

    return bLastTimeLog - aLastTimeLog;
  }
}
