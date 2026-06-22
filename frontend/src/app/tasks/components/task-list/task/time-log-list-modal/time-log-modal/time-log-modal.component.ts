import { ChangeDetectionStrategy, Component, inject, signal, type WritableSignal } from '@angular/core';
import { type FieldTree, form, FormField, required, validate } from '@angular/forms/signals';
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

import type { TimeLogDialogData } from '@tasks/interfaces/time-log-dialog-data.interface';
import type { TimeLogFormData } from '@tasks/interfaces/time-log-form-data.interface';
import type { TimeLogFormValue } from '@tasks/interfaces/time-log-form-value.interface';
import type { TimeLogModalResponse } from '@tasks/interfaces/time-log-modal-response.interface';
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
  private static readonly invalidChronologyError: {
    kind: string;
    message: string;
  } = {
    kind: 'invalidChronology',
    message: 'End time must be later than start time.',
  };

  protected readonly data: TimeLogDialogData = inject<TimeLogDialogData>(MAT_DIALOG_DATA);
  protected readonly timeLogFormModel: WritableSignal<TimeLogFormValue> = signal<TimeLogFormValue>({
    startTime: null,
    endTime: null,
    description: '',
  });
  protected readonly timeLogForm: FieldTree<TimeLogFormValue> = form(this.timeLogFormModel, (path) => {
    required(path.startTime, { message: 'Start time is required.' });
    validate(path.endTime, ({ value, valueOf }) => this.validateEndTime(valueOf(path.startTime), value()));
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

    const timeLog: TimeLog = buildTimeLogPayload(this.data.timeLog, this.buildSaveFormData(this.timeLogFormModel()));

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

  private buildSaveFormData(
    formData: TimeLogFormData,
  ): TimeLogFormData {
    return {
      ...formData,
      startTime: this.toUtcWallClockDate(formData.startTime),
      endTime: this.toUtcWallClockDate(formData.endTime),
    };
  }

  private validateEndTime(
    startTime: Date | null,
    endTime: Date | null,
  ): typeof TimeLogModalComponent.invalidChronologyError | null {
    if (!startTime || !endTime) {
      return null;
    }

    if (endTime.getTime() === 0 || endTime.getTime() > startTime.getTime()) {
      return null;
    }

    return TimeLogModalComponent.invalidChronologyError;
  }

  private toUtcWallClockDate(
    date: Date | null | undefined,
  ): Date | null {
    if (date === undefined || date === null || date.getTime() === 0) {
      return null;
    }

    return fromWallClockDateInTimezone(date, this.timezoneService.timezone);
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
