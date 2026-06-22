import { SelectionModel } from '@angular/cdk/collections';
import { CdkCellDef, CdkColumnDef, CdkFooterCellDef, CdkFooterRowDef, CdkHeaderCellDef, CdkHeaderRowDef } from '@angular/cdk/table';
import { formatDate } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  injectAsync,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { take } from 'rxjs';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';
import { formatDateInTimezone } from '@core/utilities/format-date-in-timezone.utility';

import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import type { AreYouSureService } from '@shared/services/are-you-sure.service';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { getNestedObject } from '@shared/utilities/get-nested-object.utility';

@Component({
  selector: 'shared-shared-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    CdkHeaderCellDef,
    CdkColumnDef,
    CdkCellDef,
    CdkFooterCellDef,
    CdkHeaderRowDef,
    CdkFooterRowDef,
  ],
})
export class TableComponent implements AfterViewInit {
  private static readonly hiddenLoopColumns: string[] = [
    'select',
    'remove',
    'sync',
  ];

  public readonly isSelectable: InputSignal<boolean> = input(true);
  public readonly enableRemoveAction: InputSignal<boolean> = input(false);
  public readonly enableSyncAction: InputSignal<boolean> = input(false);
  public readonly stickyHeader: InputSignal<boolean> = input(true);
  public readonly stickyFooter: InputSignal<boolean> = input(true);
  public readonly enableFooter: InputSignal<boolean> = input(false);
  public readonly sortField: InputSignal<string> = input('id');
  public readonly sortDirection: InputSignal<'' | 'asc' | 'desc'> = input<SortDirection>('asc');
  public readonly columns: InputSignal<Column[]> = input<Column[]>([]);
  public readonly data: InputSignal<Searchable[] | null | undefined> = input<Searchable[] | null>();

  protected readonly cellClicked: OutputEmitterRef<[Searchable, Column]> = output<[
    Searchable,
    Column
  ]>();
  protected readonly footerCellClicked: OutputEmitterRef<[Searchable[], Column]> = output<[
    Searchable[],
    Column
  ]>();
  protected readonly removeAction: OutputEmitterRef<Searchable> = output<Searchable>();
  protected readonly syncAction: OutputEmitterRef<Searchable> = output<Searchable>();

  protected readonly sort: Signal<MatSort> = viewChild.required(MatSort);

  protected readonly paginator: Signal<MatPaginator> = viewChild.required(MatPaginator);
  protected readonly displayedColumns: Signal<string[]> = computed(() => {
    const columns: string[] = this.columns()
      .filter(({ hidden }: Column) => !hidden)
      .filter(({ excludeFromLoop }: Column) => !excludeFromLoop)
      .map(({ columnDef }: Column) => columnDef);

    if (this.enableRemoveAction()) {
      columns.push('remove');
    }

    if (this.isSelectable()) {
      columns.unshift('select');
    }

    return columns;
  });
  protected readonly loopColumns: Signal<Column[]> = computed(() => this.columns().filter((column: Column) => this.shouldDisplayColumn(column)));
  protected readonly syncColumn: Signal<Column | undefined> = computed(() => this.columns().find((column: Column) => this.shouldShowSyncColumn(column)));

  protected selection: SelectionModel<Searchable> = new SelectionModel<Searchable>(true, []);

  protected dataSource: MatTableDataSource<Searchable> = new MatTableDataSource<Searchable>([]);

  private readonly loadAreYouSureService: AsyncLoader<AreYouSureService> = injectAsync(
    () => import('@shared/services/are-you-sure.service').then((m) => m.AreYouSureService),
  );
  private readonly timezoneService: TimezoneService = inject(TimezoneService);
  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly readableTimePipe: ReadableTimePipe = new ReadableTimePipe();

  private _data: Searchable[] = [];

  constructor() {
    effect(() => {
      this._data = [...(this.data() ?? [])];
      this.selection.clear();
      this.dataSource.data = this._data;
    });
  }

  public ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.sortingDataAccessor = (item: Searchable, property: string): string | number => {
      const value: unknown = getNestedObject(
        item,
        property.split('.'),
      );

      if (value instanceof Date) {
        return value.getTime();
      }

      return (typeof value === 'number' || typeof value === 'string') ? value : '';
    };
    this.dataSource.paginator = this.paginator();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  protected isAllSelected(): boolean {
    const numSelected: number = this.selection.selected.length;
    const numRows: number = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  protected masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(
        (row: Searchable) => this.selection.select(row),
      );
    }
  }

  protected onMasterToggle(): void {
    this.masterToggle();
  }

  protected onSelectionToggle(
    row: Searchable,
  ): void {
    this.selection.toggle(row);
  }

  protected shouldDisplayColumn(
    column: Column,
  ): boolean {
    return !column.hidden &&
      !column.excludeFromLoop &&
      !TableComponent.hiddenLoopColumns.includes(column.columnDef);
  }

  protected onCellClick(
    row: Searchable,
    column: Column,
  ): void {
    if (column.isClickable) {
      this.cellClicked.emit([
        row,
        column,
      ]);
    }
  }

  protected onFooterCellClicked(
    column: Column,
  ): void {
    if (column.isClickable && !column.disableFooterClick) {
      this.footerCellClicked.emit([
        this._data,
        column,
      ]);
    }
  }

  protected async onRemoveAction(
    row: Searchable,
  ): Promise<void> {
    const timeLog: TimeLog | undefined = row as TimeLog;

    if (!timeLog) {
      return;
    }

    const areYouSureService: AreYouSureService = await this.loadAreYouSureService();
    const confirmation$: ReturnType<AreYouSureService['openDialog']> | undefined = areYouSureService.openDialog(
      this.buildRemoveConfirmationLabel(timeLog),
    );

    if (!confirmation$) {
      return;
    }

    confirmation$
      .pipe(take(1))
      .subscribe((response: boolean | undefined) => {
        if (response === true) {
          this.removeAction.emit(timeLog);
        }
      });
  }

  protected onSyncAction(
    row: Searchable,
  ): void {
    const task: Task | undefined = row as Task;
    this.syncAction.emit(task);
  }

  protected getColumnCellValue(
    row: Searchable,
    column: Column,
  ): string | number {
    return this.formatCellValue(column.cell(row), column.pipe, 'yyyy-MM-dd');
  }

  protected getFooterCellValue(
    column: Column,
  ): string | number {
    const footerValue: unknown = column.hasFooter && column.footerCell ?
      column.footerCell(this.dataSource.data) :
      undefined;

    return this.formatCellValue(footerValue, column.pipe);
  }

  protected shouldShowFooter(): boolean {
    return this.enableFooter();
  }

  protected shouldShowSyncColumn(
    column: Column,
  ): boolean {
    return column.columnDef === 'sync' && !column.hidden && !column.excludeFromLoop;
  }

  protected hasSyncColumn(): boolean {
    return this.syncColumn() !== undefined;
  }

  protected isSyncDisabled(
    row: Searchable,
    column: Column,
  ): boolean {
    return column.taskSynced?.(row) ?? false;
  }

  protected isFooterClickable(
    column: Column,
  ): boolean {
    return !!column.isClickable && !column.disableFooterClick;
  }

  protected onRowClick(
    row: Searchable,
  ): void {
    if (this.isSelectable()) {
      this.selection.toggle(row);
    }
  }

  protected formatDateValue(
    value: Date | string | number | null | undefined,
    format: string = 'yyyy-MM-dd',
  ): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return formatDateInTimezone(
        value,
        format,
        this.localeService.locale,
        this.timezoneService.timezone,
      );
    }

    return formatDate(value, format, this.localeService.locale, this.timezoneService.timezone);
  }

  private formatCellValue(
    value: unknown,
    pipe: Column['pipe'],
    dateFormat?: string,
  ): string | number {
    if (pipe === 'readableTime') {
      return this.readableTimePipe.transform(this.toNumericValue(value));
    }

    if (pipe === 'date') {
      return this.formatDateValue(value as Date | string | number | null | undefined, dateFormat ?? 'yyyy-MM-dd');
    }

    return this.toDisplayValue(value);
  }

  private toNumericValue(
    value: unknown,
  ): number {
    return typeof value === 'number' ?
      value :
      Number(value ?? 0);
  }

  private toDisplayValue(
    value: unknown,
  ): string | number {
    if (Array.isArray(value)) {
      return value.every((entry: unknown) => typeof entry === 'string' || typeof entry === 'number') ?
        value.join(',') :
        '';
    }

    return typeof value === 'string' || typeof value === 'number' ?
      value :
      '';
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
      formatDateInTimezone(value, 'HH:mm:ss', this.localeService.locale, this.timezoneService.timezone) :
      null;
  }
}
