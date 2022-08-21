import { Component, Inject }             from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';


@Component(
  {
    selector: 'app-error-dialog',
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
