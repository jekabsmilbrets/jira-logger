import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';

@Component({
  selector: 'shared-error-dialog',
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    JsonPipe,
  ],
})
export class ErrorDialogComponent {
  protected data: ErrorDialogDataInterface = inject<ErrorDialogDataInterface>(MAT_DIALOG_DATA);

  private dialogRef: MatDialogRef<ErrorDialogComponent, undefined> = inject<MatDialogRef<ErrorDialogComponent, undefined>>(MatDialogRef);

  protected onClose(): void {
    this.dialogRef.close();
  }
}
