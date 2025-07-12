import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { AreYouSureDialogComponent } from '../components/are-you-sure-dialog/are-you-sure-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class AreYouSureService {
  private dialogRef!: MatDialogRef<AreYouSureDialogComponent, boolean | undefined>;

  private readonly matDialog: MatDialog = inject(MatDialog);

  public openDialog(
    deleteString: string,
  ): Observable<boolean | undefined> {
    this.dialogRef = this.matDialog.open(
      AreYouSureDialogComponent,
      {
        data: {
          deleteString,
        },
      },
    );

    return this.dialogRef.afterClosed();
  }
}
