import { ChangeDetectionStrategy, Component, computed, inject, injectAsync, type Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';

import { take } from 'rxjs';

import { Locale } from '@core/services/locale';
import { Timezone } from '@core/services/timezone';
import { formatDateInTimezone } from '@core/utilities/format-date-in-timezone.utility';

import { Table } from '@shared/components/table/table';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableConfiguration } from '@shared/interfaces/table-configuration.interface';
import type { TableRowAction } from '@shared/interfaces/table-row-action.interface';
import { TimeLog } from '@shared/models/time-log.model';
import { TimeLogs } from '@shared/services/time-logs';
import type { AsyncLoader } from '@shared/types/async-loader.type';

import { createTimeLogListColumns } from '@tasks/constants/time-log-list-columns.constant';
import type { TimeLogListDialogData } from '@tasks/interfaces/time-log-dialog-data.interface';
import type { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';
import type { TimeLogEdit } from '@tasks/services/time-log-edit';
import { TimeLogEditSession, type TimeLogEditSessionSaveResult } from '@tasks/services/time-log-edit-session';

@Component({
  selector: 'tasks-time-log-list-modal',
  templateUrl: './time-log-list-modal.html',
  styleUrls: ['./time-log-list-modal.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatToolbarModule,
    Table,
  ],
})
export class TimeLogListModal {
  protected readonly data: TimeLogListDialogData = inject<TimeLogListDialogData>(MAT_DIALOG_DATA);

  protected columns: Column[];
  protected readonly rowActions: TableRowAction[] = [
    {
      id: 'remove',
      columnDef: 'remove',
      header: 'Remove',
      icon: 'delete',
      ariaLabel: 'Remove row',
      color: 'warn',
      confirmLabel: (row: Searchable) => this.buildRemoveConfirmationLabel(row as TimeLog),
    },
  ];

  private readonly loadTimeLogEditService: AsyncLoader<TimeLogEdit> = injectAsync(
    () => import('@tasks/services/time-log-edit').then((m) => m.TimeLogEdit),
  );
  private readonly timeLogsService: TimeLogs = inject(TimeLogs);
  private readonly localeService: Locale = inject(Locale);
  private readonly timezoneService: Timezone = inject(Timezone);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly dialogRef: MatDialogRef<TimeLogListModal, undefined | TimeLogsModalResponse> = inject<MatDialogRef<TimeLogListModal, TimeLogsModalResponse | undefined>>(MatDialogRef);
  private readonly session: TimeLogEditSession = new TimeLogEditSession(this.data.task, this.timeLogsService);

  protected readonly timeLogs: Signal<TimeLog[]> = this.session.timeLogs;
  protected readonly tableConfiguration: Signal<TableConfiguration> = computed(() => ({
    columns: this.columns,
    data: this.timeLogs(),
    footer: true,
    selectable: false,
    rowActions: this.rowActions,
    sort: {
      direction: 'desc',
      field: 'startTime',
    },
  }));

  constructor() {
    this.columns = createTimeLogListColumns(
      () => this.localeService.locale,
      () => this.timezoneService.timezone,
    );
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onSave(): void {
    this.session.save()
      .pipe(take(1))
      .subscribe((result: TimeLogEditSessionSaveResult) => {
        if (result.message) {
          this.openSnackBar(result.message);
        }

        if (result.close) {
          this.dialogRef.close(result.response);
        }
      });
  }

  protected async onCellClick(
    [timeLog]: [Searchable, Column],
  ): Promise<void> {
    const timeLogEditService: TimeLogEdit = await this.loadTimeLogEditService();

    this.session.edit(timeLog as TimeLog, timeLogEditService);
  }

  protected onRemoveAction(
    timeLog: Searchable,
  ): void {
    this.session.remove(timeLog as TimeLog);
  }

  protected async onAddTimeLogClick(): Promise<void> {
    const timeLogEditService: TimeLogEdit = await this.loadTimeLogEditService();

    this.session.add(timeLogEditService);
  }

  private openSnackBar(
    message: string,
    duration: number = 5000,
  ): void {
    this.matSnackBar.open(
      message,
      undefined,
      {
        duration,
      },
    );
  }

  private buildRemoveConfirmationLabel(
    timeLog: TimeLog,
  ): string {
    const timeLogDate: string = formatDateInTimezone(timeLog.date, 'yyyy-MM-dd', this.localeService.locale, this.timezoneService.timezone);
    const timeLogStart: string | null = this.formatTimePart(timeLog.startTime);
    const timeLogEnd: string | null = this.formatTimePart(timeLog.endTime);

    return `Time log "${ timeLogDate } ${ timeLogStart }-${ timeLogEnd }"`;
  }

  private formatTimePart(
    value: Date | undefined,
  ): string | null {
    return value ?
      formatDateInTimezone(
        value,
        'HH:mm:ss',
        this.localeService.locale,
        this.timezoneService.timezone,
      ) :
      null;
  }
}
