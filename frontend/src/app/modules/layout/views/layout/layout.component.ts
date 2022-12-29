import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task }               from '@shared/models/task.model';
import { TaskManagerService } from '@shared/services/task-manager.service';
import { TasksService }       from '@shared/services/tasks.service';


@Component(
  {
    selector: 'layout-view',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
  },
)
export class LayoutComponent {
  public isLoading$: Observable<boolean>;
  public timeLoggedToday$: Observable<number>;
  public activeTask$: Observable<Task | null>;

  constructor(
    private loaderStateService: LoaderStateService,
    private tasksService: TasksService,
    private taskManagerService: TaskManagerService,
  ) {
    this.isLoading$ = this.loaderStateService.isLoading$;
    this.activeTask$ = this.taskManagerService.activeTask$;
    this.timeLoggedToday$ = this.taskManagerService.timeLoggedToday$;
  }
}
