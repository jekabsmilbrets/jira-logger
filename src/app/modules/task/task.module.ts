import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskComponent } from './components/task/task.component';
import { TasksService } from './services/tasks.service';

import { TaskRoutingModule } from './task-routing.module';
import { ReportComponent } from './views/report/report.component';
import { TasksComponent } from './views/tasks/tasks.component';
import { TimerComponent } from './views/timer/timer.component';

@NgModule({
  declarations: [
    TasksComponent,
    TimerComponent,
    ReportComponent,
    TaskComponent,
    TaskListComponent,
  ],
  imports: [
    CommonModule,
    TaskRoutingModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
  ],
  providers: [
    TasksService,
  ],
})
export class TaskModule {
}
