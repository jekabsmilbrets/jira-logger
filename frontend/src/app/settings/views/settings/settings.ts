import { ChangeDetectionStrategy, Component, computed, inject, OnInit, type Signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { take } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { LoaderState } from '@core/services/loader-state';
import { Settings as SettingsStore } from '@core/services/settings';

import { Tag } from '@shared/models/tag.model';
import { Tags } from '@shared/services/tags';

import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import { Report } from '@report/services/report';

import { JiraApiConfigurator } from '@settings/components/jira-api-configurator/jira-api-configurator';
import { ReportConfigurator } from '@settings/components/report-configurator/report-configurator';
import { TagManagementConfigurator } from '@settings/components/tag-management-configurator/tag-management-configurator';
import { UserSettingsConfigurator } from '@settings/components/user-settings-configurator/user-settings-configurator';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';
import { SettingsChange } from '@settings/services/settings-change';

@Component({
  selector: 'settings-view',
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JiraApiConfigurator,
    UserSettingsConfigurator,
    ReportConfigurator,
    TagManagementConfigurator,
    MatSnackBarModule,
  ],
})
export class Settings implements OnInit {
  protected readonly loaderStateService: LoaderState = inject(LoaderState);

  private readonly settingsService: SettingsStore = inject(SettingsStore);
  private readonly reportService: Report = inject(Report);
  private readonly tagsService: Tags = inject(Tags);
  private readonly settingsChangeService: SettingsChange = inject(SettingsChange);

  protected readonly isLoading: Signal<boolean> = this.loaderStateService.isLoading;
  protected readonly settings: Signal<Setting[]> = this.settingsService.settings;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;
  protected readonly jiraApiSettings: Signal<Setting[]> = computed(() => this.filterSettings(Object.values(JiraApiSettings)));
  protected readonly jiraUserSettings: Signal<Setting[]> = computed(() => this.filterSettings(Object.values(JiraUserSettings)));
  protected readonly reportSettings: Signal<ReportSettingsControlsState> = this.reportService.settingsControlsState;

  public ngOnInit(): void {
    this.tagsService.list()
      .pipe(take(1))
      .subscribe({
        next: () => undefined,
        error: () => undefined,
      });
  }

  protected onReportSettingsChange(
    intent: ReportSettingsIntent,
  ): void {
    this.reportService.applySettingsChange({
      type: 'settings-intent',
      intent,
    });
  }

  protected onSettingsChange(
    saveEvent: SettingsSaveEvent,
  ): void {
    this.settingsChangeService.saveSettings(saveEvent);
  }

  protected onTagManagementChange(
    tagChangeEvent: TagManagementCommand,
  ): void {
    this.settingsChangeService.saveTag(tagChangeEvent);
  }

  private filterSettings(settingNames: string[]): Setting[] {
    return this.settings().filter((setting: Setting) => settingNames.includes(setting.name));
  }

}
