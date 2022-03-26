import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TasksViewComponent } from './views/tasks/tasks-view.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
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
