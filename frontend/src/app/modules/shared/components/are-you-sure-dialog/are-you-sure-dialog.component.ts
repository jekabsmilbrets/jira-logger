import { Component, Inject }             from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { AreYouSureDialogDataInterface } from '@shared/interfaces/are-you-sure-dialog-data.interface';


@Component(
  {
    selector: 'shared-are-you-sure-dialog',
    templateUrl: './are-you-sure-dialog.component.html',
    styleUrls: ['./are-you-sure-dialog.component.scss'],
  },
)
export class AreYouSureDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<AreYouSureDialogComponent, boolean | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: AreYouSureDialogDataInterface,
  ) {
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onDelete(): void {
    this.dialogRef.close(true);
  }
}
