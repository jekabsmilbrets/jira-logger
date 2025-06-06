import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { ReportModule } from '@report/report.module';

import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';
import { TaskListConfiguratorComponent } from '@settings/components/task-list-configurator/task-list-configurator.component';
import { SettingsRoutingModule } from '@settings/settings-routing.module';
import { SettingsComponent } from '@settings/views/settings/settings.component';

import { SharedModule } from '@shared/shared.module';

@NgModule({
  declarations: [
    SettingsComponent,
    JiraApiConfiguratorComponent,
    TaskListConfiguratorComponent,
    ReportConfiguratorComponent,
  ],
  imports: [
    CommonModule,
    SettingsRoutingModule,
    SharedModule,
    ReportModule,
    ReactiveFormsModule,
  ],
})
export class SettingsModule {
}
