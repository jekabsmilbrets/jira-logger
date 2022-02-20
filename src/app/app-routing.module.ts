import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportComponent } from 'src/app/views/report/report.component';

import { TasksComponent } from './views/tasks/tasks.component';
import { TimerComponent } from './views/timer/timer.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
  {
    path: 'report',
    component: ReportComponent,
  },
  {
    path: 'tasks',
    component: TasksComponent,
  },
  {
    path: 'timer',
    component: TimerComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
