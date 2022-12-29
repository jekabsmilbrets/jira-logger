import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ReportSettings } from '@settings/interfaces/report-settings.interface';

import { Tag } from '@shared/models/tag.model';

import { ReportModeEnum } from '@report/enums/report-mode.enum';


@Component({
  selector: 'settings-report-configurator',
  templateUrl: './report-configurator.component.html',
  styleUrls: ['./report-configurator.component.scss'],
})
export class ReportConfiguratorComponent {
  @Input()
  public disabled: boolean | null = false;

  @Input()
  public reportSettings: ReportSettings | null = {
    reportMode: ReportModeEnum.total,
    tags: [],
    date: null,
    startDate: null,
    endDate: null,
    showWeekends: false,
    hideUnreportedTasks: false,
  };

  @Output()
  public reportModeChange: EventEmitter<ReportModeEnum> = new EventEmitter<ReportModeEnum>();

  @Output()
  public tagChange: EventEmitter<Tag[]> = new EventEmitter<Tag[]>();

  @Output()
  public dateChange: EventEmitter<Date | null> = new EventEmitter<Date | null>();

  @Output()
  public startDateChange: EventEmitter<Date | null> = new EventEmitter<Date | null>();

  @Output()
  public endDateChange: EventEmitter<Date | null> = new EventEmitter<Date | null>();

  @Output()
  public showWeekendsChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  @Output()
  public hideUnreportedTasksChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  public onReportModeChange(value: ReportModeEnum): void {
    this.reportModeChange.emit(value);
  }

  public onTagChange(value: Tag[]): void {
    this.tagChange.emit(value);
  }

  public onDateChange(date: Date | null): void {
    this.dateChange.emit(date);
  }

  public onStartDateChange(date: Date | null): void {
    this.startDateChange.emit(date);
  }

  public onEndDateChange(date: Date | null): void {
    this.endDateChange.emit(date);
  }

  public onShowWeekendsChange(showWeekends: boolean): void {
    this.showWeekendsChange.emit(showWeekends);
  }

  public onHideUnreportedTasksChange(hideUnreportedTasks: boolean): void {
    this.hideUnreportedTasksChange.emit(hideUnreportedTasks);
  }

  public showDatePicker(): boolean {
    const reportMode = this.reportSettings?.reportMode;
    if (reportMode) {
      return [
        'dateRange',
        'date',
      ].includes(reportMode);
    }

    return false;
  }
}
