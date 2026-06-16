import { Routes } from '@angular/router';

export const settingsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () => import('./views/settings/settings.component')
          .then(m => m.SettingsComponent),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
