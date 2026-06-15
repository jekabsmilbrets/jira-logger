import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import type { AreYouSureDialogData } from '@shared/interfaces/are-you-sure-dialog-data.interface';

@Component({
  selector: 'shared-are-you-sure-dialog',
  templateUrl: './are-you-sure-dialog.component.html',
  styleUrls: ['./are-you-sure-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
  ],
})
export class AreYouSureDialogComponent {
  protected data: AreYouSureDialogData = inject<AreYouSureDialogData>(MAT_DIALOG_DATA);

  private dialogRef: MatDialogRef<AreYouSureDialogComponent, undefined | boolean> = inject<MatDialogRef<AreYouSureDialogComponent, boolean | undefined>>(MatDialogRef);

  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  protected onDelete(): void {
    this.dialogRef.close(true);
  }
}
