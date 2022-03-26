import { NgModule }            from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { TaskListComponent }             from '@task/components/task-list/task-list.component';
import { TaskComponent }                 from '@task/components/task/task.component';
import { TimeLogListModalComponent }     from '@task/components/time-log-list-modal/time-log-list-modal.component';
import { TimeLogModalComponent }         from '@task/components/time-log-list-modal/time-log-modal/time-log-modal.component';

import { TasksService } from '@task/services/tasks.service';

import { TaskRoutingModule } from '@task/task-routing.module';

import { TasksViewComponent } from '@task/views/tasks/tasks-view.component';

@NgModule({
            declarations: [
              TaskComponent,
              TaskListComponent,
              TasksViewComponent,

              TimeLogListModalComponent,
              TimeLogModalComponent,
            ],
            imports: [
              ReactiveFormsModule,

              TaskRoutingModule,

              SharedModule,
            ],
            providers: [
              TasksService,
            ],
          })
export class TaskModule {
}
