import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AreYouSureDialogDataInterface } from '@shared/interfaces/are-you-sure-dialog-data.interface';

@Component({
  selector: 'shared-are-you-sure-dialog',
  templateUrl: './are-you-sure-dialog.component.html',
  styleUrls: ['./are-you-sure-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
  ],
})
export class AreYouSureDialogComponent {
  protected data: AreYouSureDialogDataInterface = inject<AreYouSureDialogDataInterface>(MAT_DIALOG_DATA);

  private dialogRef: MatDialogRef<AreYouSureDialogComponent, undefined | boolean> = inject<MatDialogRef<AreYouSureDialogComponent, boolean | undefined>>(MatDialogRef);

  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  protected onDelete(): void {
    this.dialogRef.close(true);
  }
}
