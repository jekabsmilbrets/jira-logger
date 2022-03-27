import { Injectable }              from '@angular/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { ErrorDialogComponent }     from '@shared/components/error-dialog/error-dialog.component';
import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';

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
