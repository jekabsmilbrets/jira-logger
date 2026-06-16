import { Routes } from '@angular/router';

import { TasksMenuComponent } from '@tasks/components/tasks-menu/tasks-menu.component';

import { ReportMenuComponent } from '@report/components/report-menu/report-menu.component';
import { reportResolver } from '@report/resolvers/report.resolver';

import { HEADER_MENU_ROUTE_DATA_KEY } from '@layout/interfaces/header-menu-route-data.interface';

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
        data: {
          [HEADER_MENU_ROUTE_DATA_KEY]: {
            menuId: 'tasks',
            menuComponent: TasksMenuComponent,
          },
        },
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
        data: {
          [HEADER_MENU_ROUTE_DATA_KEY]: {
            menuId: 'report',
            menuComponent: ReportMenuComponent,
          },
        },
        children: [
          {
            path: '',
            loadComponent: () => import('@report/views/report/report-view.component')
              .then(m => m.ReportViewComponent),
            resolve: {
              settingsFromPath: reportResolver,
            },
          },
          {
            path: ':reportMode',
            loadComponent: () => import('@report/views/report/report-view.component')
              .then(m => m.ReportViewComponent),
            resolve: {
              settingsFromPath: reportResolver,
            },
          },
          {
            path: ':reportMode/:date',
            loadComponent: () => import('@report/views/report/report-view.component')
              .then(m => m.ReportViewComponent),
            resolve: {
              settingsFromPath: reportResolver,
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
