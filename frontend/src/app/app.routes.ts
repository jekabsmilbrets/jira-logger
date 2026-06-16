import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () => import('@layout/views/layout/layout.component')
      .then(m => m.LayoutComponent),
    children: [
      {
        path: 'tasks',
        loadChildren: () => import('@tasks/tasks.routes')
          .then(m => m.tasksRoutes),
      },
      {
        path: 'report',
        loadChildren: () => import('@report/report.routes')
          .then(m => m.reportRoutes),
      },
      {
        path: 'settings',
        loadChildren: () => import('@settings/settings.routes')
          .then(m => m.settingsRoutes),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
];
