import { DatePipe } from '@angular/common';
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
    DatePipe,
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

  public ngOnInit(): void {
    this.formGroup.patchValue({
      startTime: this.data.timeLog.startTime && new Date(this.data.timeLog.startTime.getTime()),
      endTime: this.data.timeLog.endTime && new Date(this.data.timeLog.endTime.getTime()),
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
}
