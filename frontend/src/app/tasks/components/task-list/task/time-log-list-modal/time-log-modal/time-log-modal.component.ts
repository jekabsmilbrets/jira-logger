import { Component, inject, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { fromWallClockDateInTimezone, toWallClockDateInTimezone } from '@core/utils/timezone-date.utility';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogDialogDataInterface } from '@tasks/interfaces/time-log-dialog-data.interface';
import { TimeLogFormData } from '@tasks/interfaces/time-log-form-data.interface';
import { TimeLogFormGroup } from '@tasks/interfaces/time-log-form-group.interface';
import { TimeLogModalResponseInterface } from '@tasks/interfaces/time-log-modal-response.interface';
import { buildTimeLogPayload } from '@tasks/utils/task-payload-builder.util';

@Component({
  selector: 'tasks-time-log-modal',
  templateUrl: './time-log-modal.component.html',
  styleUrls: ['./time-log-modal.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatTimepickerModule,
    ReactiveFormsModule,
  ],
})
export class TimeLogModalComponent implements OnInit {
  protected data: TimeLogDialogDataInterface = inject<TimeLogDialogDataInterface>(MAT_DIALOG_DATA);

  protected formGroup: FormGroup<TimeLogFormGroup> = new FormGroup<TimeLogFormGroup>({
    startTime: new FormControl<Date | null>(null, Validators.required),
    endTime: new FormControl<Date | null>(null),
    description: new FormControl<string | null>(null),
  }, { validators: TimeLogModalComponent.validateChronology });

  private dialogRef: MatDialogRef<TimeLogModalComponent, undefined | TimeLogModalResponseInterface> = inject<MatDialogRef<TimeLogModalComponent, TimeLogModalResponseInterface | undefined>>(MatDialogRef);
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly timezoneService: TimezoneService = inject(TimezoneService);

  public ngOnInit(): void {
    const timezone = this.timezoneService.timezone;

    this.formGroup.patchValue({
      startTime: this.data.timeLog.startTime && toWallClockDateInTimezone(this.data.timeLog.startTime, timezone),
      endTime: this.data.timeLog.endTime && toWallClockDateInTimezone(this.data.timeLog.endTime, timezone),
      description: this.data.timeLog.description,
    });
  }

  protected onCancel(): void {
    this.dialogRef.close({
      responseType: 'cancel',
    });
  }

  protected onSave(): void {
    const formData: TimeLogFormData = this.formGroup.getRawValue();

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

  private static validateChronology(control: AbstractControl): ValidationErrors | null {
    const startTime: Date | null = control.get('startTime')?.value ?? null;
    const endTime: Date | null = control.get('endTime')?.value ?? null;

    if (null === startTime || null === endTime) {
      return null;
    }

    return endTime.getTime() > startTime.getTime() ? null : { invalidChronology: true };
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
