import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './views/layout/layout.component';
import { PageNotFoundComponent } from './views/page-not-found/page-not-found.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'tasks',
        loadChildren: () => import('@tasks/tasks.module').then(m => m.TasksModule),
      },
      {
        path: 'report',
        loadChildren: () => import('@report/report.module').then(m => m.ReportModule),
      },
      {
        path: 'settings',
        loadChildren: () => import('@settings/settings.module').then(m => m.SettingsModule),
      },
      {
        path: '**',
        redirectTo: 'tasks',
        pathMatch: 'full',
      },
      {
        path: '**',
        component: PageNotFoundComponent,
      },
    ],
  },
];

@NgModule(
  {
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
  },
)
export class LayoutRoutingModule {
}
