import { ChangeDetectionStrategy, Component, effect, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { DateRange, ExtractDateTypeFromSelection, MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ReportModeEnum } from '@report/enums/report-mode.enum';

@Component({
  selector: 'shared-report-date-selector',
  templateUrl: './report-date-selector.component.html',
  styleUrls: ['./report-date-selector.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatFormFieldModule,
    MatNativeDateModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
})
export class ReportDateSelectorComponent {
  public readonly reportMode: InputSignal<ReportModeEnum> = input.required<ReportModeEnum>();
  public readonly showLabel: InputSignal<boolean> = input<boolean>(false);
  public readonly disabled: InputSignal<boolean | null | undefined> = input<boolean | null>();
  public readonly date: InputSignal<Date | null | undefined> = input<Date | null>();
  public readonly startDate: InputSignal<Date | null | undefined> = input<Date | null>();
  public readonly endDate: InputSignal<Date | null | undefined> = input<Date | null>();

  protected dateFormControl: FormControl<Date | null> = new FormControl<Date | null>(null);
  protected startDateFormControl: FormControl<Date | null> = new FormControl<Date | null>(null);
  protected endDateFormControl: FormControl<Date | null> = new FormControl<Date | null>(null);

  protected readonly dateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly startDateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly endDateChange: OutputEmitterRef<null | Date> = output<Date | null>();

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.dateFormControl.disable();
        this.startDateFormControl.disable();
        this.endDateFormControl.disable();
      } else {
        this.dateFormControl.enable();
        this.startDateFormControl.enable();
        this.endDateFormControl.enable();
      }
    });

    effect(() => {
      const value = this.date();
      if (value) {
        this.dateFormControl.setValue(
          value,
          {
            emitEvent: false,
          },
        );
      }
    });

    effect(() => {
      const value = this.startDate();
      if (value) {
        this.startDateFormControl.setValue(
          value,
          {
            emitEvent: false,
          },
        );
      }
    });

    effect(() => {
      const value = this.endDate();
      if (value) {
        this.endDateFormControl.setValue(
          value,
          {
            emitEvent: false,
          },
        );
      }
    });
  }

  protected onStartDateChange(
    value: MatDatepickerInputEvent<ExtractDateTypeFromSelection<DateRange<Date>>, DateRange<Date>>,
  ): void {
    if (value.value !== null) {
      const startDate: Date = value.value;

      startDate.setHours(0, 0, 0, 0);

      this.startDateChange.emit(startDate);
    }
  }

  protected onEndDateChange(
    value: MatDatepickerInputEvent<ExtractDateTypeFromSelection<DateRange<Date>>, DateRange<Date>>,
  ): void {
    if (value.value !== null) {
      const endDate: Date = value.value;

      endDate.setHours(23, 59, 59);

      this.endDateChange.emit(endDate);
    }
  }

  protected onDateChange(
    value: MatDatepickerInputEvent<unknown, unknown | null>,
  ): void {
    if (value.value !== null) {
      const startDate: Date = value.value as Date;

      startDate.setHours(0, 0, 0, 0);

      this.dateChange.emit(startDate);
    }
  }
}
