import { NgxMatNativeDateModule, NgxMatTimepickerModule, NgxMatDatetimePickerModule } from '@angular-material-components/datetime-picker';
import { ClipboardModule }                                                            from '@angular/cdk/clipboard';
import { LayoutModule }                                                               from '@angular/cdk/layout';
import { CdkTableModule }                                                             from '@angular/cdk/table';
import { CommonModule }                                                               from '@angular/common';
import { NgModule }                                                                   from '@angular/core';
import { MatAutocompleteModule }                                                      from '@angular/material/autocomplete';
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
import { MatProgressBarModule }                                                       from '@angular/material/progress-bar';
import { MatSelectModule }                                                            from '@angular/material/select';
import { MatSidenavModule }                                                           from '@angular/material/sidenav';
import { MatSlideToggleModule }                                                       from '@angular/material/slide-toggle';
import { MatSnackBarModule }                                                          from '@angular/material/snack-bar';
import { MatSortModule }                                                              from '@angular/material/sort';
import { MatTableModule }                                                             from '@angular/material/table';
import { MatToolbarModule }                                                           from '@angular/material/toolbar';
import { MatTooltipModule }                                                           from '@angular/material/tooltip';

import { AreYouSureDialogComponent } from '@shared/components/are-you-sure-dialog/are-you-sure-dialog.component';

import { ErrorDialogComponent } from '@shared/components/error-dialog/error-dialog.component';
import { TableComponent }       from '@shared/components/table/table.component';

import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';

import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { ErrorDialogService } from '@shared/services/error-dialog.service';

@NgModule({
            imports: [
              CommonModule,

              CdkTableModule,
              LayoutModule,

              ClipboardModule,

              MatAutocompleteModule,
              MatButtonModule,
              MatButtonToggleModule,
              MatCardModule,
              MatCheckboxModule,
              MatChipsModule,
              MatDatepickerModule,
              MatDialogModule,
              MatFormFieldModule,
              MatIconModule,
              MatInputModule,
              MatListModule,
              MatNativeDateModule,
              MatPaginatorModule,
              MatProgressBarModule,
              MatSelectModule,
              MatSidenavModule,
              MatSlideToggleModule,
              MatSnackBarModule,
              MatSortModule,
              MatTableModule,
              MatToolbarModule,
              MatTooltipModule,

              NgxMatDatetimePickerModule,
              NgxMatNativeDateModule,
              NgxMatTimepickerModule,
            ],
            exports: [
              CommonModule,

              CdkTableModule,
              LayoutModule,

              ClipboardModule,

              MatAutocompleteModule,
              MatButtonModule,
              MatButtonToggleModule,
              MatCardModule,
              MatCheckboxModule,
              MatChipsModule,
              MatDatepickerModule,
              MatDialogModule,
              MatFormFieldModule,
              MatIconModule,
              MatInputModule,
              MatListModule,
              MatNativeDateModule,
              MatPaginatorModule,
              MatProgressBarModule,
              MatSelectModule,
              MatSidenavModule,
              MatSlideToggleModule,
              MatSnackBarModule,
              MatSortModule,
              MatTableModule,
              MatToolbarModule,
              MatTooltipModule,

              NgxMatDatetimePickerModule,
              NgxMatNativeDateModule,
              NgxMatTimepickerModule,

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
            ],
          })
export class SharedModule {
}
