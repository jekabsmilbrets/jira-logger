import { Routes } from '@angular/router';

import { HEADER_MENU_ROUTE_DATA_KEY } from '@layout/interfaces/header-menu-route-data.interface';

import { TasksMenuComponent } from './components/tasks-menu/tasks-menu.component';

export const tasksRoutes: Routes = [
  {
    path: '',
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
        loadComponent: () => import('./views/tasks/tasks-view.component')
          .then(m => m.TasksViewComponent),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
