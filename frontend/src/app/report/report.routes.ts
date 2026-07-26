import { type Route, Routes } from '@angular/router';

import { HEADER_MENU_ROUTE_DATA_KEY } from '@layout/interfaces/header-menu-route-data.interface';

import { ReportMenu } from './components/report-menu/report-menu';
import { report } from './resolvers/report';

const reportViewRoute: (
  path: string,
) => Route = (
  path: string,
): Route => ({
  path,
  loadComponent: () => import('./views/report/report-view')
    .then(m => m.ReportView),
  resolve: {
    settingsFromPath: report,
  },
});

export const reportRoutes: Routes = [
  {
    path: '',
    data: {
      [HEADER_MENU_ROUTE_DATA_KEY]: {
        menuId: 'report',
        menuComponent: ReportMenu,
      },
    },
    children: [
      reportViewRoute(''),
      reportViewRoute(':reportMode'),
      reportViewRoute(':reportMode/:date'),
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];
