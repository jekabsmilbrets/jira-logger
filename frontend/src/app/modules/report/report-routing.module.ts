import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReportResolver }      from '@report/resolvers/report.resolver';
import { ReportViewComponent } from '@report/views/report/report-view.component';


const routes: Routes = [
  {
    path: '',
    component: ReportViewComponent,
    resolve: {
      settingsFromPath: ReportResolver,
    },
  },
  {
    path: ':reportMode',
    component: ReportViewComponent,
    resolve: {
      settingsFromPath: ReportResolver,
    },
  },
  {
    path: ':reportMode/:date',
    component: ReportViewComponent,
    resolve: {
      settingsFromPath: ReportResolver,
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule(
  {
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
  },
)
export class ReportRoutingModule {
}
