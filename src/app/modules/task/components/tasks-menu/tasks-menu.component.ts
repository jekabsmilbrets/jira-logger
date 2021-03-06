import { Component } from '@angular/core';

import { take, switchMap, of } from 'rxjs';

import { TaskInterface } from '@task/interfaces/task.interface';
import { Task }          from '@task/models/task.model';

import { TasksSettingsService } from '@task/services/tasks-settings.service';

import { TasksService } from '@task/services/tasks.service';

@Component({
             selector: 'app-tasks-menu',
             templateUrl: './tasks-menu.component.html',
             styleUrls: ['./tasks-menu.component.scss'],
           })
export class TasksMenuComponent {
  constructor(
    private tasksService: TasksService,
    private tasksSettingsService: TasksSettingsService,
  ) {
  }

  public onOpenSettingsDialog(): void {
    this.tasksService.tasks$
        .pipe(
          take(1),
          switchMap((tasks: Task[]) => this.tasksSettingsService.openDialog(tasks)),
          take(1),
          switchMap(
            (result: TaskInterface[] | undefined) => result ?
                                                     this.tasksService.importData(result)
                                                         .pipe(
                                                           take(1),
                                                           switchMap(() => this.tasksService.list()),
                                                           take(1),
                                                         ) :
                                                     of(false),
          ),
        )
        .subscribe();
  }
}
