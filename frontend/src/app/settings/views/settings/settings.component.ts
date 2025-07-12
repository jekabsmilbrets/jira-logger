import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

import { ReportSettings } from '@settings/interfaces/report-settings.interface';

import { Tag } from '@shared/models/tag.model';

import { combineLatest, forkJoin, map, Observable, shareReplay, take } from 'rxjs';

@Component({
  selector: 'settings-view',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [
    JiraApiConfiguratorComponent,
    ReportConfiguratorComponent,
    CommonModule,
  ],
})
export class SettingsComponent {
  protected readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  protected isLoading$: Observable<boolean>;
  protected settings$: Observable<Setting[]>;
  protected jiraApiSettings$: Observable<Setting[]>;
  protected reportSettings$: Observable<ReportSettings>;

  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly reportService: ReportService = inject(ReportService);

  constructor() {
    this.isLoading$ = this.loaderStateService.isLoading$.pipe(shareReplay());
    this.settings$ = this.settingsService.settings$;
    this.jiraApiSettings$ = this.settings$.pipe(
      map(
        (settings: Setting[]) => settings.filter(
          (setting: Setting) => Object.values(JiraApiSettings)
            .includes(setting.name as JiraApiSettings),
        ),
      ),
    );
    this.reportSettings$ = combineLatest([
      this.reportService.reportMode$,
      this.reportService.tags$,
      this.reportService.date$,
      this.reportService.startDate$,
      this.reportService.endDate$,
      this.reportService.showWeekends$,
      this.reportService.hideUnreportedTasks$,
    ])
      .pipe(
        map(
          ([reportMode, tags, date, startDate, endDate, showWeekends, hideUnreportedTasks]: [
            ReportModeEnum,
            Tag[],
              Date | null,
              Date | null,
              Date | null,
            boolean,
            boolean,
          ]) => ({
            reportMode,
            tags,
            date,
            startDate,
            endDate,
            showWeekends,
            hideUnreportedTasks,
          }),
        ),
      );
  }

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
        (setting: Setting) => this.settingsService.update(setting),
      ),
    )
      .pipe(take(1))
      .subscribe();
  }
}
