import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReportViewComponent } from './views/report/report-view.component';
import { TasksViewComponent }  from './views/tasks/tasks-view.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'report',
    redirectTo: 'report/total',
    pathMatch: 'full',
  },
  {
    path: 'report/:reportMode',
    component: ReportViewComponent,
  },
  {
    path: 'list',
    component: TasksViewComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
            imports: [RouterModule.forChild(routes)],
            exports: [RouterModule],
          })
export class TaskRoutingModule {
}
