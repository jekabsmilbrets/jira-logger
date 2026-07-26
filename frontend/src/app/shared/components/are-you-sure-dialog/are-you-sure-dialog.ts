import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import type { AreYouSureDialogData } from '@shared/interfaces/are-you-sure-dialog-data.interface';

@Component({
  selector: 'shared-are-you-sure-dialog',
  templateUrl: './are-you-sure-dialog.html',
  styleUrls: ['./are-you-sure-dialog.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
  ],
})
export class AreYouSureDialog {
  protected data: AreYouSureDialogData = inject<AreYouSureDialogData>(MAT_DIALOG_DATA);

  private dialogRef: MatDialogRef<AreYouSureDialog, undefined | boolean> = inject<MatDialogRef<AreYouSureDialog, boolean | undefined>>(MatDialogRef);

  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  protected onDelete(): void {
    this.dialogRef.close(true);
  }
}
