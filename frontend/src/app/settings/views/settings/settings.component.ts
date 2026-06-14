import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { forkJoin, switchMap, take } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { Tag } from '@shared/models/tag.model';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';
import { UserSettingsConfiguratorComponent } from '@settings/components/user-settings-configurator/user-settings-configurator.component';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import { ReportSettings } from '@settings/interfaces/report-settings.interface';

@Component({
  selector: 'settings-view',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JiraApiConfiguratorComponent,
    UserSettingsConfiguratorComponent,
    ReportConfiguratorComponent,
  ],
})
export class SettingsComponent {
  protected readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly reportService: ReportService = inject(ReportService);
  protected readonly isLoading = toSignal(this.loaderStateService.isLoading$, { initialValue: false });
  protected readonly settings = this.settingsService.settings;
  protected readonly jiraApiSettings = computed(() => this.filterSettings(Object.values(JiraApiSettings)));
  protected readonly jiraUserSettings = computed(() => this.filterSettings(Object.values(JiraUserSettings)));
  protected readonly reportSettings = computed<ReportSettings>(() => ({
    reportMode: this.reportService.reportMode(),
    tags: this.reportService.tags(),
    date: this.reportService.date(),
    startDate: this.reportService.startDate(),
    endDate: this.reportService.endDate(),
    showWeekends: this.reportService.showWeekends(),
    hideUnreportedTasks: this.reportService.hideUnreportedTasks(),
  }));

  protected onReportModeChange(
    value: ReportModeEnum,
  ): void {
    this.reportService.reportMode = value;
  }

  protected onTagChange(
    value: Tag[],
  ): void {
    this.reportService.tags = value;
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.reportService.date = date;
  }

  protected onStartDateChange(
    date: Date | null,
  ): void {
    this.reportService.startDate = date;
  }

  protected onEndDateChange(
    date: Date | null,
  ): void {
    this.reportService.endDate = date;
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.reportService.showWeekends = showWeekends;
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.reportService.hideUnreportedTasks = hideUnreportedTasks;
  }

  protected onSettingsChange(
    changedSettings: Setting[],
  ): void {
    forkJoin(
      changedSettings.map(
        (setting: Setting) => this.settingsService.update(setting, true),
      ),
    )
      .pipe(
        take(1),
        switchMap(() => this.settingsService.list()),
        take(1),
      )
      .subscribe();
  }

  private filterSettings(settingNames: string[]): Setting[] {
    return this.settings().filter((setting: Setting) => settingNames.includes(setting.name));
  }
}
