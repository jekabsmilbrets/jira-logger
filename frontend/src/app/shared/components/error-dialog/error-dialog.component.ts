import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ErrorDialogData } from '@shared/interfaces/error-dialog-data.interface';

@Component({
  selector: 'shared-error-dialog',
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    JsonPipe,
  ],
})
export class ErrorDialogComponent {
  protected data: ErrorDialogData = inject<ErrorDialogData>(MAT_DIALOG_DATA);

  private dialogRef: MatDialogRef<ErrorDialogComponent, undefined> = inject<MatDialogRef<ErrorDialogComponent, undefined>>(MatDialogRef);

  protected onClose(): void {
    this.dialogRef.close();
  }
}
