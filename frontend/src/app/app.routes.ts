import { Routes } from '@angular/router';

import { ReportResolver } from '@report/resolvers/report.resolver';

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
        children: [
          {
            path: '',
            redirectTo: 'list',
            pathMatch: 'full',
          },
          {
            path: 'list',
            loadComponent: () => import('@tasks/views/tasks/tasks-view.component')
              .then(m => m.TasksViewComponent),
          },
          {
            path: '**',
            redirectTo: '',
          },
        ],
      },
      {
        path: 'report',
        children: [
          {
            path: '',
            loadComponent: () => import('@report/views/report/report-view.component')
              .then(m => m.ReportViewComponent),
            resolve: {
              settingsFromPath: ReportResolver,
            },
          },
          {
            path: ':reportMode',
            loadComponent: () => import('@report/views/report/report-view.component')
              .then(m => m.ReportViewComponent),
            resolve: {
              settingsFromPath: ReportResolver,
            },
          },
          {
            path: ':reportMode/:date',
            loadComponent: () => import('@report/views/report/report-view.component')
              .then(m => m.ReportViewComponent),
            resolve: {
              settingsFromPath: ReportResolver,
            },
          },
          {
            path: '**',
            redirectTo: '',
          },
        ],
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadComponent: () => import('@settings/views/settings/settings.component')
              .then(m => m.SettingsComponent),
          },
          {
            path: '**',
            redirectTo: '',
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
];
