import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AreYouSureDialogComponent } from '@shared/components/are-you-sure-dialog/are-you-sure-dialog.component';
import { ErrorDialogComponent } from '@shared/components/error-dialog/error-dialog.component';
import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
// eslint-disable-next-line max-len
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';
import { TableComponent } from '@shared/components/table/table.component';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { AreYouSureService } from '@shared/services/are-you-sure.service';
import { ErrorDialogService } from '@shared/services/error-dialog.service';

import { MaterialModule } from '../material/material.module';

@NgModule(
  {
    imports: [
      CommonModule,

      MaterialModule,
      ReactiveFormsModule,
    ],
    exports: [
      CommonModule,

      MaterialModule,

      TableComponent,
      ReadableTimePipe,

      ReportTagFilterComponent,
      ReportDateSelectorComponent,
      ReportShowWeekendsComponent,
      ReportHideUnreportedTasksComponent,
      ReportModeSwitcherComponent,
    ],
    declarations: [
      TableComponent,

      ReadableTimePipe,
      AreYouSureDialogComponent,
      ErrorDialogComponent,

      ReportTagFilterComponent,
      ReportDateSelectorComponent,
      ReportShowWeekendsComponent,
      ReportHideUnreportedTasksComponent,
      ReportModeSwitcherComponent,
    ],
    providers: [
      AreYouSureService,
      ErrorDialogService,
    ],
  },
)
export class SharedModule {
}
