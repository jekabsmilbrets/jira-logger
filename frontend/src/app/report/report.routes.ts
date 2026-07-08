import { type Route, Routes } from '@angular/router';

import { HEADER_MENU_ROUTE_DATA_KEY } from '@layout/interfaces/header-menu-route-data.interface';

import { ReportMenuComponent } from './components/report-menu/report-menu.component';
import { reportResolver } from './resolvers/report.resolver';

const reportViewRoute: (
  path: string,
) => Route = (
  path: string,
): Route => ({
  path,
  loadComponent: () => import('./views/report/report-view.component')
    .then(m => m.ReportViewComponent),
  resolve: {
    settingsFromPath: reportResolver,
  },
});

export const reportRoutes: Routes = [
  {
    path: '',
    data: {
      [HEADER_MENU_ROUTE_DATA_KEY]: {
        menuId: 'report',
        menuComponent: ReportMenuComponent,
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
