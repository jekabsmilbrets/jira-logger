import { NgModule }            from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { ReportMenuComponent } from '@report/components/report-menu/report-menu.component';
import { ReportRoutingModule } from '@report/report-routing.module';
import { ReportResolver }      from '@report/resolvers/report.resolver';
import { ReportViewComponent } from '@report/views/report/report-view.component';


@NgModule(
  {
    declarations: [
      ReportViewComponent,

      ReportMenuComponent,
    ],
    imports: [
      ReactiveFormsModule,

      ReportRoutingModule,

      SharedModule,
    ],
    providers: [
      ReportResolver,
    ],
  },
)
export class ReportModule {
}
