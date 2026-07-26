import { Routes } from '@angular/router';

import { HEADER_MENU_ROUTE_DATA_KEY } from '@layout/interfaces/header-menu-route-data.interface';

import { TasksMenu } from './components/tasks-menu/tasks-menu';

export const tasksRoutes: Routes = [
  {
    path: '',
    data: {
      [HEADER_MENU_ROUTE_DATA_KEY]: {
        menuId: 'tasks',
        menuComponent: TasksMenu,
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
        loadComponent: () => import('./views/tasks/tasks-view')
          .then(m => m.TasksView),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
