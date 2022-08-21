import { CommonModule } from '@angular/common';
import { NgModule }     from '@angular/core';

import { MaterialModule } from 'app/modules/material/material.module';

import { AreYouSureDialogComponent } from '@shared/components/are-you-sure-dialog/are-you-sure-dialog.component';

import { ErrorDialogComponent } from '@shared/components/error-dialog/error-dialog.component';
import { TableComponent }       from '@shared/components/table/table.component';

import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { TasksService }       from '@shared/services/tasks.service';


@NgModule(
  {
    imports: [
      CommonModule,

      MaterialModule,
    ],
    exports: [
      CommonModule,

      MaterialModule,

      TableComponent,
      ReadableTimePipe,
    ],
    declarations: [
      TableComponent,

      ReadableTimePipe,
      AreYouSureDialogComponent,
      ErrorDialogComponent,
    ],
    providers: [
      AreYouSureService,
      ErrorDialogService,
      TasksService,
    ],
  },
)
export class SharedModule {
}
