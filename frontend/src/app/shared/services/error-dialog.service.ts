import { inject, Service } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { ErrorDialogComponent } from '@shared/components/error-dialog/error-dialog.component';
import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';

@Service()
export class ErrorDialogService {
  private readonly matDialog: MatDialog = inject(MatDialog);

  private dialogRef!: MatDialogRef<ErrorDialogComponent, undefined>;

  public openDialog(
    errorData: ErrorDialogDataInterface,
  ): Observable<undefined> {
    this.dialogRef = this.matDialog.open(
      ErrorDialogComponent,
      {
        disableClose: true,
        data: errorData,
      },
    );

    return this.dialogRef.afterClosed();
  }
}
