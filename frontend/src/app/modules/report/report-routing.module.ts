import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ReportViewComponent } from '@report/views/report/report-view.component';

const routes: Routes = [
  {
    path: '',
    component: ReportViewComponent,
  },
  {
    path: ':reportMode',
    component: ReportViewComponent,
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
