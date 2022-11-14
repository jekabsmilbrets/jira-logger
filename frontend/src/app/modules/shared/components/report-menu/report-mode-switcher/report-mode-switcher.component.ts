import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl }                            from '@angular/forms';

import { reportModes } from '@report/constants/report-modes.constant';

import { ReportModeEnum } from '@report/enums/report-mode.enum';


@Component(
  {
    selector: 'app-report-mode-switcher',
    templateUrl: './report-mode-switcher.component.html',
    styleUrls: ['./report-mode-switcher.component.scss'],
  },
)
export class ReportModeSwitcherComponent {
  public reportModes: {
    value: ReportModeEnum;
    viewValue: string;
  }[] = reportModes;

  public reportModeFormControl: FormControl<ReportModeEnum | null> = new FormControl<ReportModeEnum | null>(ReportModeEnum.total);

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
