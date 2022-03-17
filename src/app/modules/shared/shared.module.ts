import { NgxMatNativeDateModule, NgxMatTimepickerModule, NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { CdkTableModule }                                                             from '@angular/cdk/table';
import { CommonModule }                                                               from '@angular/common';
import { NgModule }                                                                   from '@angular/core';
import { MatButtonModule }                                                            from '@angular/material/button';
import { MatButtonToggleModule }                                                      from '@angular/material/button-toggle';
import { MatCardModule }                                                              from '@angular/material/card';
import { MatCheckboxModule }                                                          from '@angular/material/checkbox';
import { MatChipsModule }                                                             from '@angular/material/chips';
import { MatNativeDateModule }                                                        from '@angular/material/core';
import { MatDatepickerModule }                                                        from '@angular/material/datepicker';
import { MatDialogModule }                                                            from '@angular/material/dialog';
import { MatFormFieldModule }                                                         from '@angular/material/form-field';
import { MatIconModule }                                                              from '@angular/material/icon';
import { MatInputModule }                                                             from '@angular/material/input';
import { MatListModule }                                                              from '@angular/material/list';
import { MatPaginatorModule }                                                         from '@angular/material/paginator';
import { MatSelectModule }                                                            from '@angular/material/select';
import { MatSidenavModule }                                                           from '@angular/material/sidenav';
import { MatSortModule }                                                              from '@angular/material/sort';
import { MatTableModule }                                                             from '@angular/material/table';
import { MatToolbarModule }                                                           from '@angular/material/toolbar';
import { MatTooltipModule }                                                           from '@angular/material/tooltip';

import { TableComponent } from './components/table/table.component';

import { ReadableTimePipe } from './pipes/readable-time.pipe';

@NgModule({
            imports: [
              CommonModule,
              MatButtonModule,
              MatButtonToggleModule,
              MatCardModule,
              MatFormFieldModule,
              MatIconModule,
              MatInputModule,
              MatListModule,
              MatPaginatorModule,
              MatSelectModule,
              MatSidenavModule,
              MatSortModule,
              MatTableModule,
              MatToolbarModule,
              MatCheckboxModule,
              CdkTableModule,
              MatTooltipModule,
              MatChipsModule,
              MatDialogModule,
              MatDatepickerModule,
              MatNativeDateModule,

              NgxMatDatetimePickerModule,
              NgxMatTimepickerModule,
              NgxMatNativeDateModule,
            ],
            exports: [
              CommonModule,
              MatButtonModule,
              MatButtonToggleModule,
              MatCardModule,
              MatFormFieldModule,
              MatIconModule,
              MatInputModule,
              MatListModule,
              MatPaginatorModule,
              MatSelectModule,
              MatSidenavModule,
              MatSortModule,
              MatTableModule,
              MatToolbarModule,
              MatChipsModule,
              MatDialogModule,
              MatDatepickerModule,
              MatNativeDateModule,

              NgxMatDatetimePickerModule,
              NgxMatTimepickerModule,
              NgxMatNativeDateModule,

              TableComponent,
              ReadableTimePipe,
            ],
            declarations: [
              TableComponent,

              ReadableTimePipe,
            ],
          })
export class SharedModule {
}
