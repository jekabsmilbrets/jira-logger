import { NgModule }            from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '@shared/shared.module';

import { ReportDateSelectorComponent }        from '@report/components/report-menu/report-date-selector/report-date-selector.component';
// eslint-disable-next-line max-len
import { ReportHideUnreportedTasksComponent } from '@report/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportMenuComponent }                from '@report/components/report-menu/report-menu.component';
import { ReportModeSwitcherComponent }        from '@report/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent }        from '@report/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent }           from '@report/components/report-menu/report-tag-filter/report-tag-filter.component';
import { ReportRoutingModule }                from '@report/report-routing.module';
import { ReportService }                      from '@report/services/report.service';
import { ReportViewComponent }                from '@report/views/report/report-view.component';


@NgModule(
  {
    declarations: [
      ReportModeSwitcherComponent,
      ReportViewComponent,

      ReportMenuComponent,
      ReportTagFilterComponent,
      ReportDateSelectorComponent,
      ReportShowWeekendsComponent,
      ReportHideUnreportedTasksComponent,
    ],
    imports: [
      ReactiveFormsModule,

      ReportRoutingModule,

      SharedModule,
    ],
    providers: [
      ReportService,
    ],
  },
)
export class ReportModule {
}
