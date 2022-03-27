import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormControl }                            from '@angular/forms';

import { ReportModeEnum } from '@report/enums/report-mode.enum';

@Component({
             selector: 'app-report-mode-switcher',
             templateUrl: './report-mode-switcher.component.html',
             styleUrls: ['./report-mode-switcher.component.scss'],
           })
export class ReportModeSwitcherComponent {
  public reportModes: {
    value: ReportModeEnum;
    viewValue: string;
  }[] = [
    {
      value: ReportModeEnum.total,
      viewValue: 'Total',
    },
    {
      value: ReportModeEnum.dateRange,
      viewValue: 'Date Range',
    },
  ];

  public reportModeFormControl: FormControl = new FormControl(ReportModeEnum.total);

  @Output()
  public reportModeChange: EventEmitter<ReportModeEnum> = new EventEmitter<ReportModeEnum>();

  @Input()
  public set reportMode(reportMode: ReportModeEnum | null) {
    if (reportMode) {
      this.reportModeFormControl.setValue(
        reportMode,
        {emitEvent: false},
      );
    }
  }

  public reportModeValueChange(value: ReportModeEnum): void {
    this.reportModeChange.emit(value);
  }
}
