import { Component, Inject, OnInit }          from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef }      from '@angular/material/dialog';

import { TimeLogDialogDataInterface }    from '@task/interfaces/time-log-dialog-data.interface';
import { TimeLogModalResponseInterface } from '@task/interfaces/time-log-modal-response.interface';


@Component(
  {
    selector: 'app-time-log-modal',
    templateUrl: './time-log-modal.component.html',
    styleUrls: ['./time-log-modal.component.scss'],
  },
)
export class TimeLogModalComponent implements OnInit {

  public formGroup: FormGroup<{
    startTime: FormControl<Date | null>;
    endTime: FormControl<Date | null>;
    description: FormControl<string | null>;
  }> = new FormGroup<{
    startTime: FormControl<Date | null>;
    endTime: FormControl<Date | null>;
    description: FormControl<string | null>;
  }>(
    {
      startTime: new FormControl<Date | null>(null, Validators.required),
      endTime: new FormControl<Date | null>(null),
      description: new FormControl<string | null>(null),
    },
  );

  constructor(
    private dialogRef: MatDialogRef<TimeLogModalComponent, TimeLogModalResponseInterface | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: TimeLogDialogDataInterface,
  ) {
  }

  public ngOnInit(): void {
    this.formGroup.patchValue(
      {
        startTime: this.data.timeLog.startTime && new Date(this.data.timeLog.startTime.getTime()),
        endTime: this.data.timeLog.endTime && new Date(this.data.timeLog.endTime.getTime()),
        description: this.data.timeLog.description,
      },
    );
  }

  public onCancel(): void {
    this.dialogRef.close(
      {
        responseType: 'cancel',
      },
    );
  }

  public onSave(): void {
    const formData = this.formGroup.getRawValue();
    if (formData.endTime === undefined || formData.endTime === new Date(0)) {
      formData.endTime = null;
    }
    const timeLog = this.data.timeLog;

    Object.assign(timeLog, formData);

    this.dialogRef.close(
      {
        responseType: 'update',
        responseData: timeLog,
      },
    );
  }

  public onDelete(): void {
    this.dialogRef.close(
      {
        responseType: 'delete',
      },
    );
  }
}
