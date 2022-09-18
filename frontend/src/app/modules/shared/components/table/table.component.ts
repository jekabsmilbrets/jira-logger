import { SelectionModel }                                                   from '@angular/cdk/collections';
import { formatDate }                                                       from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { MatPaginator }                                                     from '@angular/material/paginator';
import { MatSort, SortDirection }                                           from '@angular/material/sort';
import { MatTableDataSource }                                               from '@angular/material/table';

import { take } from 'rxjs';

import { appLocale, appTimeZone } from '@core/constants/date-time.constant';

import { Column }     from '@shared/interfaces/column.interface';
import { Searchable } from '@shared/interfaces/searchable.interface';

import { TimeLog }           from '@shared/models/time-log.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';
import { getNestedObject }   from '@shared/utils/get-nested-object.util';


@Component(
  {
    selector: 'app-shared-table',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.scss'],
  },
)
export class TableComponent implements AfterViewInit {
  @Input()
  public isSelectable = true;

  @Input()
  public enableRemoveAction = false;

  @Input()
  public stickyHeader = true;

  @Input()
  public stickyFooter = true;

  @Input()
  public enableFooter = false;

  @Input()
  public sortField = 'id';

  @Input()
  public sortDirection: SortDirection = 'asc';

  @Input()
  public columns: Column[] = [];

  @Output()
  public cellClicked: EventEmitter<[Searchable, Column]> = new EventEmitter<[Searchable, Column]>();

  @Output()
  public removeAction: EventEmitter<Searchable> = new EventEmitter<Searchable>();

  @ViewChild(MatSort, {static: true})
  public sort!: MatSort;

  @ViewChild(MatPaginator, {static: true})
  public paginator!: MatPaginator;

  public selection = new SelectionModel<Searchable>(true, []);

  public dataSource: MatTableDataSource<Searchable> = new MatTableDataSource<Searchable>([]);

  private _data: Searchable[] = [];

  constructor(
    private areYouSureService: AreYouSureService,
  ) {
  }

  @Input()
  public set data(data: Searchable[] | null) {
    this._data = data ?? [];
    this.dataSource.data = this._data;
  }

  public get displayedColumns(): string[] {
    const columns = this.columns
                        .filter((column: Column) => column.visible)
                        .map((column: Column) => column.columnDef);

    if (this.enableRemoveAction) {
      columns.push('remove');
    }

    if (this.isSelectable) {
      columns.unshift('select');
    }

    return columns;
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

  public onCellClick(row: Searchable, column: Column): void {
    if (column.isClickable) {
      this.cellClicked.emit(
        [
          row,
          column,
        ],
      );
    }
  }

  public onRemoveAction(row: Searchable): void {
    const timeLog: TimeLog | undefined = row as TimeLog;

    if (!timeLog) {
      return;
    }

    const timeLogDate = formatDate(timeLog.date, 'yyyy-MM-dd', appLocale, appTimeZone);
    const timeLogStartTime = timeLog.startTime;
    const timeLogStart = timeLogStartTime ? formatDate(timeLogStartTime, 'HH:mm:ss', appLocale, appTimeZone) : null;
    const timeLogEndTime = timeLog.endTime;
    const timeLogEnd = timeLogEndTime ? formatDate(timeLogEndTime, 'HH:mm:ss', appLocale, appTimeZone) : null;

    this.areYouSureService.openDialog(
          `Time log "${timeLogDate} ${timeLogStart}-${timeLogEnd}"`,
        )
        .pipe(
          take(1),
        )
        .subscribe(
          (response: boolean | undefined) => {
            if (response === true) {
              this.removeAction.emit(timeLog);
            }
          },
        );
  }
}
