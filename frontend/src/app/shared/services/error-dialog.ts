import { inject, Service } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { ErrorDialog as ErrorDialogView } from '@shared/components/error-dialog/error-dialog';
import type { ErrorDialogData } from '@shared/interfaces/error-dialog-data.interface';

@Service()
export class ErrorDialog {
  private readonly matDialog: MatDialog = inject(MatDialog);

  private dialogRef!: MatDialogRef<ErrorDialogView, undefined>;

  public openDialog(
    errorData: ErrorDialogData,
  ): Observable<undefined> {
    this.dialogRef = this.matDialog.open(
      ErrorDialogView,
      {
        disableClose: true,
        data: errorData,
      },
    );

    return this.dialogRef.afterClosed();
  }
}
