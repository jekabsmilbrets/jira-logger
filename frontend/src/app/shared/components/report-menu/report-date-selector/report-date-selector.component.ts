import { ChangeDetectionStrategy, Component, effect, input, InputSignal, output, OutputEmitterRef, signal } from '@angular/core';
import { disabled, form, FormField } from '@angular/forms/signals';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatNativeDateModule,
    MatDatepickerModule,
    FormField,
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
  protected readonly reportDateFormModel = signal({
    date: null as Date | null,
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  protected readonly reportDateForm = form(this.reportDateFormModel, (path) => {
    disabled(path, () => !!this.disabled());
  });

  protected readonly dateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly startDateChange: OutputEmitterRef<null | Date> = output<Date | null>();
  protected readonly endDateChange: OutputEmitterRef<null | Date> = output<Date | null>();

  constructor() {
    effect(() => {
      this.reportDateForm().reset({
        date: this.date() ?? null,
        startDate: this.startDate() ?? null,
        endDate: this.endDate() ?? null,
      });
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
