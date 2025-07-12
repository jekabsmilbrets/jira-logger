import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { ReportModeEnum } from '@report/enums/report-mode.enum';

import { ReportSettings } from '@settings/interfaces/report-settings.interface';
import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';

import { Tag } from '@shared/models/tag.model';

@Component({
  selector: 'settings-report-configurator',
  templateUrl: './report-configurator.component.html',
  styleUrls: ['./report-configurator.component.scss'],
  standalone: true,
  imports: [
    MatCardModule,
    ReportModeSwitcherComponent,
    ReportDateSelectorComponent,
    ReportTagFilterComponent,
    ReportHideUnreportedTasksComponent,
    ReportShowWeekendsComponent,
  ],
})
export class ReportConfiguratorComponent {
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly reportSettings: InputSignal<ReportSettings> = input<ReportSettings>({
    reportMode: ReportModeEnum.total,
    tags: [],
    date: null,
    startDate: null,
    endDate: null,
    showWeekends: false,
    hideUnreportedTasks: false,
  });

  protected readonly reportModeChange: OutputEmitterRef<ReportModeEnum> = output<ReportModeEnum>();
  protected readonly tagChange: OutputEmitterRef<Tag[]> = output<Tag[]>();
  protected readonly dateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly startDateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly endDateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly showWeekendsChange: OutputEmitterRef<boolean> = output<boolean>();
  protected readonly hideUnreportedTasksChange: OutputEmitterRef<boolean> = output<boolean>();

  protected onReportModeChange(
    value: ReportModeEnum,
  ): void {
    this.reportModeChange.emit(value);
  }

  protected onTagChange(
    value: Tag[],
  ): void {
    this.tagChange.emit(value);
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.dateChange.emit(date);
  }

  protected onStartDateChange(
    date: Date | null,
  ): void {
    this.startDateChange.emit(date);
  }

  protected onEndDateChange(
    date: Date | null,
  ): void {
    this.endDateChange.emit(date);
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.showWeekendsChange.emit(showWeekends);
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.hideUnreportedTasksChange.emit(hideUnreportedTasks);
  }

  protected showDatePicker(): boolean {
    const reportMode: undefined | ReportModeEnum = this.reportSettings()?.reportMode;

    if (reportMode) {
      return [
        'dateRange',
        'date',
      ].includes(reportMode);
    }

    return false;
  }
}
