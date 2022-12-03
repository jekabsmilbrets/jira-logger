import { Component, EventEmitter, Input, Output }                           from '@angular/core';
import { FormControl }                                                      from '@angular/forms';
import { DateRange, ExtractDateTypeFromSelection, MatDatepickerInputEvent } from '@angular/material/datepicker';

import { ReportModeEnum } from '@report/enums/report-mode.enum';


@Component(
  {
    selector: 'app-report-date-selector',
    templateUrl: './report-date-selector.component.html',
    styleUrls: ['./report-date-selector.component.scss'],
  },
)
export class ReportDateSelectorComponent {
  public dateFormControl: FormControl<Date | null> = new FormControl<Date | null>(null);
  public startDateFormControl: FormControl<Date | null> = new FormControl<Date | null>(null);
  public endDateFormControl: FormControl<Date | null> = new FormControl<Date | null>(null);

  @Input()
  public reportMode!: ReportModeEnum | null;

  @Output()
  public dateChange: EventEmitter<Date | null> = new EventEmitter<Date | null>();

  @Output()
  public startDateChange: EventEmitter<Date | null> = new EventEmitter<Date | null>();

  @Output()
  public endDateChange: EventEmitter<Date | null> = new EventEmitter<Date | null>();

  @Input()
  public set disabled(disabled: boolean | null) {
    if (disabled) {
      this.dateFormControl.disable();
      this.startDateFormControl.disable();
      this.endDateFormControl.disable();
    } else {
      this.dateFormControl.enable();
      this.startDateFormControl.enable();
      this.endDateFormControl.enable();
    }
  }

  @Input()
  public set date(value: Date | null) {
    if (value) {
      this.dateFormControl.setValue(value, {emitEvent: false});
    }
  }

  @Input()
  public set startDate(value: Date | null) {
    if (value) {
      this.startDateFormControl.setValue(value, {emitEvent: false});
    }
  }

  @Input()
  public set endDate(value: Date | null) {
    if (value) {
      this.endDateFormControl.setValue(value, {emitEvent: false});
    }
  }

  public onStartDateChange(value: MatDatepickerInputEvent<ExtractDateTypeFromSelection<DateRange<Date>>, DateRange<Date>>): void {
    if (value.value !== null) {
      const startDate = value.value;
      startDate.setHours(0, 0, 0, 0);

      this.startDateChange.emit(startDate);
    }
  }

  public onEndDateChange(value: MatDatepickerInputEvent<ExtractDateTypeFromSelection<DateRange<Date>>, DateRange<Date>>): void {
    if (value.value !== null) {
      const endDate = value.value;
      endDate.setHours(23, 59, 59);

      this.endDateChange.emit(endDate);
    }
  }

  public onDateChange(value: MatDatepickerInputEvent<unknown, unknown | null>): void {
    if (value.value !== null) {
      const startDate = value.value as Date;
      startDate.setHours(0, 0, 0, 0);

      this.dateChange.emit(startDate);
    }
  }
}
