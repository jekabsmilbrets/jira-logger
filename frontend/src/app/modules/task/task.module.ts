import { NgModule }            from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { TasksSettingsDialogComponent } from '@task/components/settings-dialog/tasks-settings-dialog.component';

import { TaskListComponent }            from '@task/components/task-list/task-list.component';
import { TaskComponent }                from '@task/components/task/task.component';
import { TasksMenuComponent }           from '@task/components/tasks-menu/tasks-menu.component';
import { TasksSettingsToggleComponent } from '@task/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import { TimeLogListModalComponent }    from '@task/components/time-log-list-modal/time-log-list-modal.component';
import { TimeLogModalComponent }        from '@task/components/time-log-list-modal/time-log-modal/time-log-modal.component';
import { TasksSettingsService }         from '@task/services/tasks-settings.service';

import { TaskRoutingModule } from '@task/task-routing.module';

import { TasksViewComponent } from '@task/views/tasks/tasks-view.component';


@NgModule(
  {
    declarations: [
      TasksViewComponent,

      TaskComponent,
      TaskListComponent,

      TasksMenuComponent,
      TasksSettingsDialogComponent,
      TasksSettingsToggleComponent,

      TimeLogListModalComponent,
      TimeLogModalComponent,
    ],
    imports: [
      ReactiveFormsModule,

      TaskRoutingModule,

      SharedModule,
    ],
    providers: [
      TasksSettingsService,
    ],
  },
)
export class TaskModule {
}
