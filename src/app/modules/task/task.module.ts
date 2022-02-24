import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { ReportModeSwitcherComponent } from './components/report-mode-switcher/report-mode-switcher.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskComponent } from './components/task/task.component';
import { ReadableTimePipe } from './pipes/readable-time.pipe';
import { TasksService } from './services/tasks.service';

import { TaskRoutingModule } from './task-routing.module';
import { ReportComponent } from './views/report/report.component';
import { TasksComponent } from './views/tasks/tasks.component';

@NgModule({
  declarations: [
    TasksComponent,
    ReportComponent,
    TaskComponent,
    TaskListComponent,
    ReadableTimePipe,
    ReportModeSwitcherComponent,
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
