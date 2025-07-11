import { Component, Input, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { reportModes } from '@report/constants/report-modes.constant';
import { ReportModeEnum } from '@report/enums/report-mode.enum';

@Component({
  selector: 'shared-report-mode-switcher',
  templateUrl: './report-mode-switcher.component.html',
  styleUrls: ['./report-mode-switcher.component.scss'],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
})
export class ReportModeSwitcherComponent {
  public readonly showLabel: InputSignal<boolean> = input<boolean>(false);

  protected reportModes: {
    value: ReportModeEnum;
    viewValue: string;
  }[] = reportModes;

  protected reportModeFormControl: FormControl<ReportModeEnum | null> = new FormControl<ReportModeEnum | null>(ReportModeEnum.total);

  protected readonly reportModeChange: OutputEmitterRef<ReportModeEnum> = output<ReportModeEnum>();

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input()
  public set disabled(
    disabled: boolean | null,
  ) {
    if (disabled) {
      this.reportModeFormControl.disable();
    } else {
      this.reportModeFormControl.enable();
    }
  }

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input()
  public set reportMode(
    reportMode: ReportModeEnum | null,
  ) {
    if (reportMode) {
      this.reportModeFormControl.setValue(
        reportMode,
        {
          emitEvent: false,
        },
      );
    }
  }

  protected reportModeValueChange(
    value: ReportModeEnum,
  ): void {
    this.reportModeChange.emit(value);
  }
}
