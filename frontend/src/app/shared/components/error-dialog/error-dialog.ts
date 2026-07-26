import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import type { ErrorDialogData } from '@shared/interfaces/error-dialog-data.interface';

@Component({
  selector: 'shared-error-dialog',
  templateUrl: './error-dialog.html',
  styleUrls: ['./error-dialog.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    JsonPipe,
  ],
})
export class ErrorDialog {
  protected data: ErrorDialogData = inject<ErrorDialogData>(MAT_DIALOG_DATA);

  private dialogRef: MatDialogRef<ErrorDialog, undefined> = inject<MatDialogRef<ErrorDialog, undefined>>(MatDialogRef);

  protected onClose(): void {
    this.dialogRef.close();
  }
}
