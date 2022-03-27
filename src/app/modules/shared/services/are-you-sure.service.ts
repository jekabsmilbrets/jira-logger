import { Injectable }              from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import { Observable } from 'rxjs';

import { AreYouSureDialogComponent } from '../components/are-you-sure-dialog/are-you-sure-dialog.component';

@Injectable()
export class AreYouSureService {
  private dialogRef!: MatDialogRef<AreYouSureDialogComponent, boolean | undefined>;

  constructor(
    private dialog: MatDialog,
  ) {
  }

  public openDialog(
    deleteString: string,
  ): Observable<boolean | undefined> {
    this.dialogRef = this.dialog.open(
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
