import { Component } from '@angular/core';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

import { ReportSettings } from '@settings/interfaces/report-settings.interface';

import { Tag } from '@shared/models/tag.model';

import { combineLatest, forkJoin, map, Observable, shareReplay, take } from 'rxjs';

@Component({
  selector: 'settings-view',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false,
})
export class SettingsComponent {
  public isLoading$: Observable<boolean>;
  public settings$: Observable<Setting[]>;
  public jiraApiSettings$: Observable<Setting[]>;
  public reportSettings$: Observable<ReportSettings>;

  constructor(
    private settingsService: SettingsService,
    private reportService: ReportService,
    public readonly loaderStateService: LoaderStateService,
  ) {
    this.isLoading$ = this.loaderStateService.isLoading$.pipe(shareReplay());
    this.settings$ = this.settingsService.settings$;
    this.jiraApiSettings$ = this.settings$
      .pipe(
        map((settings: Setting[]) => settings.filter(
          (setting: Setting) => Object.values(JiraApiSettings)
            .includes(setting.name as JiraApiSettings)),
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
        map((
            [
              reportMode, tags, date, startDate, endDate, showWeekends, hideUnreportedTasks,
            ]: [
              ReportModeEnum, Tag[], Date | null, Date | null, Date | null, boolean, boolean
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

  public onReportModeChange(value: ReportModeEnum): void {
    this.reportService.reportMode = value;
  }

  public onTagChange(value: Tag[]): void {
    this.reportService.tags = value;
  }

  public onDateChange(date: Date | null): void {
    this.reportService.date = date;
  }

  public onStartDateChange(date: Date | null): void {
    this.reportService.startDate = date;
  }

  public onEndDateChange(date: Date | null): void {
    this.reportService.endDate = date;
  }

  public onShowWeekendsChange(showWeekends: boolean): void {
    this.reportService.showWeekends = showWeekends;
  }

  public onHideUnreportedTasksChange(hideUnreportedTasks: boolean): void {
    this.reportService.hideUnreportedTasks = hideUnreportedTasks;
  }

  public onSettingsChange(changedSettings: Setting[]) {
    forkJoin(
      changedSettings.map((setting: Setting) => this.settingsService.update(setting)),
    )
      .pipe(take(1))
      .subscribe();
  }
}
