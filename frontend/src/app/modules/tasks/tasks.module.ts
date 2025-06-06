import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { TaskListComponent } from '@tasks/components/task-list/task-list.component';
import { TaskComponent } from '@tasks/components/task-list/task/task.component';
import { TimeLogListModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-list-modal.component';
import { TimeLogModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal.component';
import { TaskViewHeaderComponent } from '@tasks/components/task-view-header/task-view-header.component';
import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';
import { TasksMenuComponent } from '@tasks/components/tasks-menu/tasks-menu.component';
import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import { TaskEditService } from '@tasks/services/task-edit.service';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';
import { TasksRoutingModule } from '@tasks/tasks-routing.module';
import { TasksViewComponent } from '@tasks/views/tasks/tasks-view.component';

@NgModule(
  {
    declarations: [
      TasksViewComponent,

      TasksMenuComponent,
      TasksSettingsDialogComponent,
      TasksSettingsToggleComponent,

      TaskViewHeaderComponent,

      TaskListComponent,
      TaskComponent,
      TimeLogListModalComponent,
      TimeLogModalComponent,
    ],
    imports: [
      ReactiveFormsModule,

      TasksRoutingModule,

      SharedModule,
    ],
    providers: [
      TasksSettingsService,
      TaskEditService,
      TimeLogEditService,
    ],
  },
)
export class TasksModule {
}
