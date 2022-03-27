import { Component } from '@angular/core';

import { TasksService } from '@task/services/tasks.service';

@Component({
             selector: 'app-tasks-menu',
             templateUrl: './tasks-menu.component.html',
             styleUrls: ['./tasks-menu.component.scss'],
           })
export class TasksMenuComponent {
  constructor(
    private tasksService: TasksService,
  ) {
  }

  public onOpenSettingsDialog(): void {
    console.log('Open Task Settings dialog');
  }
}
