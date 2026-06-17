import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { forkJoin, type Observable, switchMap, take } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';
import { TaskListConfiguratorComponent } from '@settings/components/task-list-configurator/task-list-configurator.component';
import { UserSettingsConfiguratorComponent } from '@settings/components/user-settings-configurator/user-settings-configurator.component';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { ReportSettings } from '@settings/interfaces/report-settings.interface';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import type { TaskListTagChangeEvent } from '@settings/interfaces/task-list-tag-change-event.interface';

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
    TaskListConfiguratorComponent,
    MatSnackBarModule,
  ],
})
export class SettingsComponent {
  protected readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly tagsService: TagsService = inject(TagsService);

  protected readonly isLoading: Signal<boolean> = this.loaderStateService.isLoading;
  protected readonly settings: Signal<Setting[]> = this.settingsService.settings;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;
  protected readonly jiraApiSettings: Signal<Setting[]> = computed(() => this.filterSettings(Object.values(JiraApiSettings)));
  protected readonly jiraUserSettings: Signal<Setting[]> = computed(() => this.filterSettings(Object.values(JiraUserSettings)));
  protected readonly reportSettings: Signal<ReportSettings> = computed<ReportSettings>(() => ({
    reportMode: this.reportService.reportMode(),
    tags: this.reportService.tags(),
    date: this.reportService.date(),
    startDate: this.reportService.startDate(),
    endDate: this.reportService.endDate(),
    showWeekends: this.reportService.showWeekends(),
    hideUnreportedTasks: this.reportService.hideUnreportedTasks(),
  }));

  protected onReportModeChange(
    value: ReportMode,
  ): void {
    this.reportService.setReportMode(value);
  }

  protected onTagChange(
    value: Tag[],
  ): void {
    this.reportService.setTags(value);
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.reportService.setDate(date);
  }

  protected onStartDateChange(
    date: Date | null,
  ): void {
    this.reportService.setStartDate(date);
  }

  protected onEndDateChange(
    date: Date | null,
  ): void {
    this.reportService.setEndDate(date);
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.reportService.setShowWeekends(showWeekends);
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.reportService.setHideUnreportedTasks(hideUnreportedTasks);
  }

  protected onSettingsChange(
    saveEvent: SettingsSaveEvent,
  ): void {
    forkJoin(
      saveEvent.changedSettings.map(
        (setting: Setting) => this.settingsService.update(setting, true),
      ),
    )
      .pipe(
        take(1),
        switchMap(() => this.settingsService.list()),
        take(1),
      )
      .subscribe({
        next: () => {
          this.matSnackBar.open(
            saveEvent.successMessage,
            undefined,
            {
              duration: 5000,
            },
          );
        },
        error: () => undefined,
      });
  }

  protected onTaskListTagChange(
    tagChangeEvent: TaskListTagChangeEvent,
  ): void {
    let request$: Observable<Tag | void>;

    switch (tagChangeEvent.action) {
      case 'create':
        request$ = this.tagsService.create(tagChangeEvent.tag);
        break;
      case 'update':
        request$ = this.tagsService.update(tagChangeEvent.tag);
        break;
      case 'delete':
        request$ = this.tagsService.delete(tagChangeEvent.tag);
        break;
    }

    request$
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.matSnackBar.open(
            tagChangeEvent.successMessage,
            undefined,
            {
              duration: 5000,
            },
          );
        },
        error: () => undefined,
      });
  }

  private filterSettings(settingNames: string[]): Setting[] {
    return this.settings().filter((setting: Setting) => settingNames.includes(setting.name));
  }
}
