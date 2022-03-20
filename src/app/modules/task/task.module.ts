import { NgModule }            from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { ReportMenuComponent }         from './components/report-menu/report-menu.component';
import { ReportModeSwitcherComponent } from './components/report-mode-switcher/report-mode-switcher.component';
import { ReportTagFilterComponent }    from './components/report-tag-filter/report-tag-filter.component';
import { TaskListComponent }           from './components/task-list/task-list.component';
import { TaskComponent }               from './components/task/task.component';
import { TimeLogListModalComponent }   from './components/time-log-list-modal/time-log-list-modal.component';
import { TimeLogModalComponent }       from './components/time-log-modal/time-log-modal.component';

import { ReportService } from './services/report.service';
import { TasksService }  from './services/tasks.service';

import { TaskRoutingModule } from './task-routing.module';

import { ReportViewComponent } from './views/report/report-view.component';
import { TasksViewComponent }  from './views/tasks/tasks-view.component';

@NgModule({
            declarations: [
              ReportModeSwitcherComponent,
              ReportViewComponent,

              TaskComponent,
              TaskListComponent,
              TasksViewComponent,

              TimeLogListModalComponent,
              TimeLogModalComponent,
              ReportMenuComponent,
              ReportTagFilterComponent,
            ],
            imports: [
              TaskRoutingModule,
              ReactiveFormsModule,

              SharedModule,
            ],
            providers: [
              TasksService,

              ReportService,
            ],
          })
export class TaskModule {
}
