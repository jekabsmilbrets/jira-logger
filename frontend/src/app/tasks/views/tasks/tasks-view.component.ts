import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';

import { DynamicMenu } from '@core/models/dynamic-menu';
import { DynamicMenuService } from '@core/services/dynamic-menu.service';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';
import { TaskListComponent } from '@tasks/components/task-list/task-list.component';
import { TaskComponent } from '@tasks/components/task-list/task/task.component';
import { TaskViewHeaderComponent } from '@tasks/components/task-view-header/task-view-header.component';

import { TasksMenuComponent } from '@tasks/components/tasks-menu/tasks-menu.component';
import { TaskUpdateActionEnum } from '@tasks/enums/task-update-action.enum';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';

import { map, Observable, of, switchMap, take } from 'rxjs';

@Component({
  selector: 'tasks-view',
  templateUrl: './tasks-view.component.html',
  styleUrls: ['./tasks-view.component.scss'],
  standalone: true,
  imports: [
    TaskViewHeaderComponent,
    TaskListComponent,
    TaskComponent,
    CommonModule,
  ],
})
export class TasksViewComponent implements OnInit {
  protected tasks$: Observable<Task[]>;
  protected isLoading$: Observable<boolean>;

  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);
  private readonly tasksSettingsService: TasksSettingsService = inject(TasksSettingsService);
  private readonly dynamicMenuService: DynamicMenuService = inject(DynamicMenuService);

  constructor() {
    this.isLoading$ = this.tasksService.isLoading$;
    this.tasks$ = this.tasksService.tasks$.pipe(
      switchMap((tasks: Task[]) => of([...tasks].sort(this.taskSort))),
    );
  }

  public ngOnInit(): void {
    this.createDynamicMenu();
  }

  protected onAction(
    [task, action]: [Task, TaskUpdateActionEnum],
  ): void {
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

  protected onUpdate(
    task: Task,
  ): void {
    this.tasksService.update(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onRemove(
    task: Task,
  ): void {
    this.tasksService.delete(task)
      .pipe(take(1))
      .subscribe();
  }

  protected onCreateTimeLog(
    [task, timeLog]: [Task, TimeLog],
  ): void {
    this.timeLogsService.create(
      task,
      timeLog,
    )
      .pipe(
        take(1),
        switchMap(() => this.tasksService.list()),
        take(1),
      )
      .subscribe();
  }

  protected onUpdateTimeLog(
    [task, timeLog]: [Task, TimeLog],
  ): void {
    this.timeLogsService.update(
      task,
      timeLog,
    )
      .pipe(
        take(1),
        switchMap(() => this.tasksService.list()),
        take(1),
      )
      .subscribe();
  }

  protected onRemoveTimeLog(
    [task, timeLog]: [Task, TimeLog],
  ): void {
    this.timeLogsService.delete(
      task,
      timeLog,
    )
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
          ],
        },
      ),
    );
  }

  private taskSort(
    a: Task,
    b: Task,
  ): number {
    const mapDateTime: (timeLogs: TimeLog[]) => number[] = (
      timeLogs: TimeLog[],
    ): number[] => timeLogs.map(
      (l: TimeLog) => l.startTime.getTime(),
    );

    const aLastTimeLog: number = Math.max(...mapDateTime(a.timeLogs), -1);
    const bLastTimeLog: number = Math.max(...mapDateTime(b.timeLogs), -1);

    return bLastTimeLog - aLastTimeLog;
  }
}
