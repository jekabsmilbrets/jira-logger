import { SelectionModel }                              from '@angular/cdk/collections';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { MatPaginator }                                from '@angular/material/paginator';
import { MatSort, SortDirection }                     from '@angular/material/sort';
import { MatTableDataSource }                          from '@angular/material/table';

import { Column }          from '@shared/interfaces/column.interface';
import { Searchable }      from '@shared/interfaces/searchable.interface';
import { getNestedObject } from '@shared/utils/get-nested-object.util';

@Component({
             selector: 'app-shared-table',
             templateUrl: './table.component.html',
             styleUrls: ['./table.component.scss'],
           })
export class TableComponent implements AfterViewInit {
  @Input()
  public isSelectable = true;

  @Input()
  public stickyHeader = true;

  @Input()
  public sortField = 'id';
  @Input()
  public sortDirection: SortDirection = 'asc';

  @Input()
  public columns: Column[] = [];

  @ViewChild(MatSort, {static: true})
  public sort!: MatSort;

  @ViewChild(MatPaginator, {static: true})
  public paginator!: MatPaginator;

  public selection = new SelectionModel<Searchable>(true, []);

  public dataSource: MatTableDataSource<Searchable> = new MatTableDataSource<Searchable>([]);

  private _data: Searchable[] = [];

  @Input()
  public set data(data: Searchable[] | null) {
    this._data = data ?? [];
    this.dataSource.data = this._data;
  }

  public get displayedColumns(): string[] {
    if (this.isSelectable) {
      return ['select'].concat(
        this.columns
            .filter((column: Column) => column.visible)
            .map((column: Column) => column.columnDef),
      );
    }
    return this.columns
               .filter((column: Column) => column.visible)
               .map((column: Column) => column.columnDef);
  }

  public ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item: any, property: string) => getNestedObject(item, property.split('.'));
    this.dataSource.paginator = this.paginator;
  }

  /** Whether the number of selected elements matches the total number of rows. */
  public isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  public masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
  }
}
