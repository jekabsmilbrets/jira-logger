import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA }   from '@angular/material/dialog';

import { Column } from '@shared/interfaces/column.interface';

import { DialogData } from '@shared/interfaces/dialog-data.interface';

import { columns as timeLogListColumns } from '@task/constants/time-log-list-columns.constant';

@Component({
             selector: 'app-time-log-list-modal',
             templateUrl: './time-log-list-modal.component.html',
             styleUrls: ['./time-log-list-modal.component.scss'],
           })
export class TimeLogListModalComponent {
  public columns: Column[] = timeLogListColumns;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
  }
}
