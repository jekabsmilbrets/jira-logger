import { Component, Input, Output, EventEmitter }                           from '@angular/core';
import { FormControl }                                                      from '@angular/forms';
import { MatDatepickerInputEvent, ExtractDateTypeFromSelection, DateRange } from '@angular/material/datepicker';

import { ReportModeEnum } from '@task/enums/report-mode.enum';

@Component({
             selector: 'app-report-date-selector',
             templateUrl: './report-date-selector.component.html',
             styleUrls: ['./report-date-selector.component.scss'],
           })
export class ReportDateSelectorComponent {
  public startDateFormControl: FormControl = new FormControl(new Date());
  public endDateFormControl: FormControl = new FormControl(new Date());

  @Input()
  public reportMode!: ReportModeEnum | null;

  @Output()
  public startDateChange: EventEmitter<Date> = new EventEmitter<Date>();

  @Output()
  public endDateChange: EventEmitter<Date> = new EventEmitter<Date>();

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
}
