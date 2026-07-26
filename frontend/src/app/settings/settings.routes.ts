import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () => import('./views/settings/settings')
          .then(m => m.Settings),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
