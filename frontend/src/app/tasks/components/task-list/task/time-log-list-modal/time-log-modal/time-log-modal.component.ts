import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTimepickerModule } from '@angular/material/timepicker';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';
import { fromWallClockDateInTimezone, toWallClockDateInTimezone } from '@core/utilities/timezone-date.utility';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogDialogData } from '@tasks/interfaces/time-log-dialog-data.interface';
import { TimeLogFormData } from '@tasks/interfaces/time-log-form-data.interface';
import { TimeLogFormValue } from '@tasks/interfaces/time-log-form-value.interface';
import { TimeLogModalResponse } from '@tasks/interfaces/time-log-modal-response.interface';
import { buildTimeLogPayload } from '@tasks/utility/task-payload-builder.utility';

@Component({
  selector: 'tasks-time-log-modal',
  templateUrl: './time-log-modal.component.html',
  styleUrls: ['./time-log-modal.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatTimepickerModule,
    FormField,
  ],
})
export class TimeLogModalComponent {
  protected readonly data: TimeLogDialogData = inject<TimeLogDialogData>(MAT_DIALOG_DATA);
  protected readonly timeLogFormModel: WritableSignal<TimeLogFormValue> = signal<TimeLogFormValue>({
    startTime: null,
    endTime: null,
    description: '',
  });
  protected readonly timeLogForm = form(this.timeLogFormModel, (path) => {
    required(path.startTime, { message: 'Start time is required.' });
    validate(path.endTime, ({ value, valueOf }) => {
      const startTime: Date | null = valueOf(path.startTime);
      const endTime: Date | null = value();

      if (startTime === null || endTime === null || endTime.getTime() === 0) {
        return null;
      }

      return endTime.getTime() > startTime.getTime() ?
        null :
        {
          kind: 'invalidChronology',
          message: 'End time must be later than start time.',
        };
    });
  });

  private readonly dialogRef: MatDialogRef<TimeLogModalComponent, undefined | TimeLogModalResponse> = inject<MatDialogRef<TimeLogModalComponent, TimeLogModalResponse | undefined>>(MatDialogRef);
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);

  constructor() {
    const timezone: string = this.timezoneService.timezone;

    this.timeLogForm().reset({
      startTime: this.data.timeLog.startTime && toWallClockDateInTimezone(this.data.timeLog.startTime, timezone),
      endTime: this.data.timeLog.endTime ?
        toWallClockDateInTimezone(this.data.timeLog.endTime, timezone) :
        null,
      description: this.data.timeLog.description ?? '',
    });
  }

  protected onCancel(): void {
    this.dialogRef.close({
      responseType: 'cancel',
    });
  }

  protected onSave(): void {
    if (this.timeLogForm().invalid()) {
      this.timeLogForm().markAsTouched();
      return;
    }

    const formData: TimeLogFormData = this.timeLogFormModel();

    if (formData.endTime === undefined || formData.endTime?.getTime() === 0) {
      formData.endTime = null;
    }

    formData.startTime = formData.startTime && fromWallClockDateInTimezone(
      formData.startTime,
      this.timezoneService.timezone,
    );
    formData.endTime = formData.endTime && fromWallClockDateInTimezone(
      formData.endTime,
      this.timezoneService.timezone,
    );

    const timeLog: TimeLog = buildTimeLogPayload(this.data.timeLog, formData);

    this.dialogRef.close({
      responseType: 'update',
      responseData: timeLog,
    });
  }

  protected onDelete(): void {
    this.dialogRef.close({
      responseType: 'delete',
    });
  }

  protected get modalTitleDateTime(): string {
    const date: Date = this.data.timeLog.startTime;
    const locale: string = this.localeService.locale;
    const timezone: string = this.timezoneService.timezone;

    try {
      return new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    }
  }
}
