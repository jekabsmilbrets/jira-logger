import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';

import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';
import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';

@Component({
  selector: 'report-settings-controls',
  templateUrl: './report-settings-controls.component.html',
  styleUrls: ['./report-settings-controls.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReportModeSwitcherComponent,
    ReportDateSelectorComponent,
    ReportTagFilterComponent,
    ReportHideUnreportedTasksComponent,
    ReportShowWeekendsComponent,
  ],
})
export class ReportSettingsControlsComponent {
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly hideWeekendsWhenDateMode: InputSignal<boolean> = input<boolean>(false);
  public readonly state: InputSignal<ReportSettingsControlsState> = input.required<ReportSettingsControlsState>();
  public readonly settingsIntent: OutputEmitterRef<ReportSettingsIntent> = output<ReportSettingsIntent>();

  protected readonly showWeekendsControl: Signal<boolean> = computed(
    () => !this.hideWeekendsWhenDateMode() || this.state().reportMode !== ReportMode.date,
  );

  protected onReportModeChange(
    reportMode: ReportMode,
  ): void {
    this.settingsIntent.emit({ type: 'set-report-mode', reportMode });
  }

  protected onTagChange(
    tags: Tag[],
  ): void {
    this.settingsIntent.emit({ type: 'set-tags', tags });
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.settingsIntent.emit({ type: 'set-date', date });
  }

  protected onStartDateChange(
    startDate: Date | null,
  ): void {
    this.settingsIntent.emit({ type: 'set-start-date', startDate });
  }

  protected onEndDateChange(
    endDate: Date | null,
  ): void {
    this.settingsIntent.emit({ type: 'set-end-date', endDate });
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.settingsIntent.emit({ type: 'set-show-weekends', showWeekends });
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.settingsIntent.emit({ type: 'set-hide-unreported-tasks', hideUnreportedTasks });
  }
}
