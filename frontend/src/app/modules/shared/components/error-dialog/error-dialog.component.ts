import { Component, Inject }             from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';


@Component(
  {
    selector: 'shared-error-dialog',
    templateUrl: './error-dialog.component.html',
    styleUrls: ['./error-dialog.component.scss'],
  },
)
export class ErrorDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ErrorDialogComponent, undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogDataInterface,
  ) {
  }

  public onClose(): void {
    this.dialogRef.close();
  }
}
