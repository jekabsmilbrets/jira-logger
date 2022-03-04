import { NgModule }              from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReportComponent } from './views/report/report.component';
import { TasksComponent }  from './views/tasks/tasks.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'report',
    component: ReportComponent,
  },
  {
    path: 'list',
    component: TasksComponent,
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
