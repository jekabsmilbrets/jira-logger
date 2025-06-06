import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';

import { reportModes } from '@report/constants/report-modes.constant';
import { ReportModeEnum } from '@report/enums/report-mode.enum';

@Component(
  {
    selector: 'shared-report-mode-switcher',
    templateUrl: './report-mode-switcher.component.html',
    styleUrls: ['./report-mode-switcher.component.scss'],
    standalone: false,
  },
)
export class ReportModeSwitcherComponent {
  public reportModes: {
    value: ReportModeEnum;
    viewValue: string;
  }[] = reportModes;

  public reportModeFormControl: FormControl<ReportModeEnum | null> = new FormControl<ReportModeEnum | null>(ReportModeEnum.total);

  @Input()
  public showLabel: boolean = false;

  @Output()
  public reportModeChange: EventEmitter<ReportModeEnum> = new EventEmitter<ReportModeEnum>();

  @Input()
  public set disabled(disabled: boolean | null) {
    if (disabled) {
      this.reportModeFormControl.disable();
    } else {
      this.reportModeFormControl.enable();
    }
  }

  @Input()
  public set reportMode(reportMode: ReportModeEnum | null) {
    if (reportMode) {
      this.reportModeFormControl.setValue(
        reportMode,
        { emitEvent: false },
      );
    }
  }

  public reportModeValueChange(value: ReportModeEnum): void {
    this.reportModeChange.emit(value);
  }
}
