import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { ErrorDialogComponent } from '@shared/components/error-dialog/error-dialog.component';
import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';

import { Observable } from 'rxjs';

@Injectable()
export class ErrorDialogService {
  private dialogRef!: MatDialogRef<ErrorDialogComponent, undefined>;

  constructor(
    private dialog: MatDialog,
  ) {
  }

  public openDialog(
    errorData: ErrorDialogDataInterface,
  ): Observable<undefined> {
    this.dialogRef = this.dialog.open(
      ErrorDialogComponent,
      {
        disableClose: true,
        data: errorData,
      },
    );

    return this.dialogRef.afterClosed();
  }
}
