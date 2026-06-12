import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { combineLatest, forkJoin, map, Observable, shareReplay, switchMap, take } from 'rxjs';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    JiraApiConfiguratorComponent,
    UserSettingsConfiguratorComponent,
    ReportConfiguratorComponent,
    AsyncPipe,
  ],
})
export class SettingsComponent {
  protected readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  protected isLoading$: Observable<boolean>;
  protected settings$: Observable<Setting[]>;
  protected jiraApiSettings$: Observable<Setting[]>;
  protected jiraUserSettings$: Observable<Setting[]>;
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
    this.jiraUserSettings$ = this.settings$.pipe(
      map(
        (settings: Setting[]) => settings.filter(
          (setting: Setting) => Object.values(JiraUserSettings)
            .includes(setting.name as JiraUserSettings),
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
}
