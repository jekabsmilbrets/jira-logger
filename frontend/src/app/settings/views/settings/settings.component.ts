import { ChangeDetectionStrategy, Component, computed, inject, OnInit, type Signal } from '@angular/core';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { take } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { SettingsService } from '@core/services/settings.service';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import { ReportService } from '@report/services/report.service';

import { JiraApiConfiguratorComponent } from '@settings/components/jira-api-configurator/jira-api-configurator.component';
import { ReportConfiguratorComponent } from '@settings/components/report-configurator/report-configurator.component';
import { TagManagementConfiguratorComponent } from '@settings/components/tag-management-configurator/tag-management-configurator.component';
import { UserSettingsConfiguratorComponent } from '@settings/components/user-settings-configurator/user-settings-configurator.component';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';
import { SettingsChangeService } from '@settings/services/settings-change.service';

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
    TagManagementConfiguratorComponent,
    MatSnackBarModule,
  ],
})
export class SettingsComponent implements OnInit {
  protected readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly settingsChangeService: SettingsChangeService = inject(SettingsChangeService);

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
