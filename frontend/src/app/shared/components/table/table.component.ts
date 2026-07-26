import { SelectionModel } from '@angular/cdk/collections';
import { CdkCellDef, CdkColumnDef, CdkFooterCellDef, CdkFooterRowDef, CdkHeaderCellDef, CdkHeaderRowDef } from '@angular/cdk/table';
import { formatDate } from '@angular/common';
import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  injectAsync,
  input,
  type InputSignal,
  output,
  OutputEmitterRef,
  type Signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { take } from 'rxjs';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';
import { formatDateInTimezone } from '@core/utilities/format-date-in-timezone.utility';

import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableConfiguration } from '@shared/interfaces/table-configuration.interface';
import type { TableRowAction } from '@shared/interfaces/table-row-action.interface';
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
  ];

  public readonly configuration: InputSignal<TableConfiguration> = input<TableConfiguration>({ columns: [] });

  protected readonly cellClicked: OutputEmitterRef<[Searchable, Column]> = output<[
    Searchable,
    Column
  ]>();
  protected readonly footerCellClicked: OutputEmitterRef<[Searchable[], Column]> = output<[
    Searchable[],
    Column
  ]>();
  protected readonly rowAction: OutputEmitterRef<[Searchable, string]> = output<[Searchable, string]>();
  protected readonly selectionChange: OutputEmitterRef<Searchable[]> = output<Searchable[]>();

  protected readonly sort: Signal<MatSort> = viewChild.required(MatSort);

  protected readonly paginator: Signal<MatPaginator> = viewChild.required(MatPaginator);
  protected readonly displayedColumns: Signal<string[]> = computed(() => {
    const columns: string[] = this.configuration().columns
      .filter(({ hidden }: Column) => !hidden)
      .filter(({ excludeFromLoop }: Column) => !excludeFromLoop)
      .map(({ columnDef }: Column) => columnDef);

    columns.push(...(this.configuration().rowActions ?? []).map((action: TableRowAction) => action.columnDef));

    if (this.configuration().selectable ?? true) {
      columns.unshift('select');
    }

    return columns;
  });
  protected readonly loopColumns: Signal<Column[]> = computed(() => this.configuration().columns.filter((column: Column) => this.shouldDisplayColumn(column)));

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
      const configuration: TableConfiguration = this.configuration();
      const selectedIds: Set<string> = new Set<string>(configuration.selectedIds ?? []);

      this._data = [...(configuration.data ?? [])];
      this.selection.clear();
      this.selection.select(...this._data.filter((row: Searchable) => selectedIds.has(row.id)));
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
    this.emitSelectionChange();
  }

  protected onSelectionToggle(
    row: Searchable,
  ): void {
    this.selection.toggle(row);
    this.emitSelectionChange();
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

  protected onRowAction(
    row: Searchable,
    action: TableRowAction,
  ): void | Promise<void> {
    if (this.isRowActionDisabled(row, action)) {
      return;
    }

    if (!action.confirmLabel) {
      this.rowAction.emit([row, action.id]);
      return;
    }

    return this.confirmRowAction(row, action);
  }

  protected getColumnCellValue(
    row: Searchable,
    column: Column,
  ): string | number {
    return this.formatCellValue(column.cell(row), column.pipe, column.dateFormat ?? 'yyyy-MM-dd');
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
    return this.configuration().footer ?? false;
  }

  protected isRowActionDisabled(
    row: Searchable,
    action: TableRowAction,
  ): boolean {
    return action.isDisabled?.(row) ?? false;
  }

  protected isFooterClickable(
    column: Column,
  ): boolean {
    return !!column.isClickable && !column.disableFooterClick;
  }

  protected onRowClick(
    row: Searchable,
  ): void {
    if (this.configuration().selectable ?? true) {
      this.selection.toggle(row);
      this.emitSelectionChange();
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

  private emitSelectionChange(): void {
    this.selectionChange.emit([...this.selection.selected]);
  }

  private async confirmRowAction(
    row: Searchable,
    action: TableRowAction,
  ): Promise<void> {
    const areYouSureService: AreYouSureService = await this.loadAreYouSureService();
    const confirmation$: ReturnType<AreYouSureService['openDialog']> | undefined = areYouSureService.openDialog(action.confirmLabel?.(row) ?? '');

    if (!confirmation$) {
      return;
    }

    confirmation$
      .pipe(take(1))
      .subscribe((response: boolean | undefined) => {
        if (response === true) {
          this.rowAction.emit([row, action.id]);
        }
      });
  }
}
