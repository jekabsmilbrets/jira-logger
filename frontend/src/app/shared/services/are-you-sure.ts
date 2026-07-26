import { inject, Service } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { AreYouSureDialog } from '../components/are-you-sure-dialog/are-you-sure-dialog';

@Service()
export class AreYouSure {
  private dialogRef!: MatDialogRef<AreYouSureDialog, boolean | undefined>;

  private readonly matDialog: MatDialog = inject(MatDialog);

  public openDialog(
    deleteString: string,
  ): Observable<boolean | undefined> {
    this.dialogRef = this.matDialog.open(
      AreYouSureDialog,
      {
        data: {
          deleteString,
        },
      },
    );

    return this.dialogRef.afterClosed();
  }
}
