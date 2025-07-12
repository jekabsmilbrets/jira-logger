import { SelectionModel } from '@angular/cdk/collections';
import {
  CdkCellDef,
  CdkColumnDef,
  CdkFooterCellDef,
  CdkFooterRowDef,
  CdkHeaderCellDef,
  CdkHeaderRowDef,
  CdkRowDef,
} from '@angular/cdk/table';
import { CommonModule, formatDate } from '@angular/common';
import { AfterViewInit, Component, inject, Input, input, InputSignal, output, OutputEmitterRef, Signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule, SortDirection } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { appLocale, appTimeZone } from '@core/constants/date-time.constant';

import { Column } from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { AreYouSureService } from '@shared/services/are-you-sure.service';
import { getNestedObject } from '@shared/utils/get-nested-object.util';

import { take } from 'rxjs';

@Component({
  selector: 'shared-shared-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: true,
  imports: [
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    CommonModule,
    ReadableTimePipe,
    CdkHeaderCellDef,
    CdkColumnDef,
    CdkCellDef,
    CdkFooterCellDef,
    CdkHeaderRowDef,
    CdkFooterRowDef,
    CdkRowDef,
  ],
})
export class TableComponent implements AfterViewInit {
  public readonly isSelectable: InputSignal<boolean> = input(true);
  public readonly enableRemoveAction: InputSignal<boolean> = input(false);
  public readonly enableSyncAction: InputSignal<boolean> = input(false);
  public readonly stickyHeader: InputSignal<boolean> = input(true);
  public readonly stickyFooter: InputSignal<boolean> = input(true);
  public readonly enableFooter: InputSignal<boolean> = input(false);
  public readonly sortField: InputSignal<string> = input('id');
  public readonly sortDirection: InputSignal<'' | 'asc' | 'desc'> = input<SortDirection>('asc');
  public readonly columns: InputSignal<Column[]> = input<Column[]>([]);

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

  protected selection: SelectionModel<Searchable> = new SelectionModel<Searchable>(true, []);

  protected dataSource: MatTableDataSource<Searchable> = new MatTableDataSource<Searchable>([]);

  private readonly areYouSureService: AreYouSureService = inject(AreYouSureService);

  private _data: Searchable[] = [];

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input()
  public set data(
    data: Searchable[] | null,
  ) {
    this._data = data ?? [];
    this.dataSource.data = this._data;
  }

  protected get displayedColumns(): string[] {
    const columns: string[] = this.columns()
      .filter(({ hidden }: Column) => !hidden)
      .filter(({ excludeFromLoop }: Column) => !excludeFromLoop)
      .map(({ columnDef }: Column) => columnDef);

    if (this.enableRemoveAction()) {
      columns.push('remove');
    }

    if (this.enableSyncAction()) {
      // columns.push('sync');
    }

    if (this.isSelectable()) {
      columns.unshift('select');
    }

    return columns;
  }

  public ngAfterViewInit(): void {
    this.dataSource.sort = this.sort();
    this.dataSource.sortingDataAccessor = (item: any, property: string) => getNestedObject(
      item,
      property.split('.'),
    );
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

  protected shouldDisplayColumn(
    column: Column,
  ): boolean {
    return !column.hidden &&
      !column.excludeFromLoop &&
      ![
        'select',
        'remove',
        'sync',
      ].includes(column.columnDef);
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

  protected onRemoveAction(
    row: Searchable,
  ): void {
    const timeLog: TimeLog | undefined = row as TimeLog;

    if (!timeLog) {
      return;
    }

    const timeLogDate: string = formatDate(timeLog.date, 'yyyy-MM-dd', appLocale, appTimeZone);
    const timeLogStartTime: Date = timeLog.startTime;
    const timeLogStart: null | string = timeLogStartTime ?
      formatDate(timeLogStartTime, 'HH:mm:ss', appLocale, appTimeZone) :
      null;
    const timeLogEndTime: undefined | Date = timeLog.endTime;
    const timeLogEnd: null | string = timeLogEndTime ?
      formatDate(timeLogEndTime, 'HH:mm:ss', appLocale, appTimeZone) :
      null;

    this.areYouSureService.openDialog(
      `Time log "${ timeLogDate } ${ timeLogStart }-${ timeLogEnd }"`,
    )
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
}
