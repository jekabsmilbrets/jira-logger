import type { SortDirection } from '@angular/material/sort';

import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableRowAction } from '@shared/interfaces/table-row-action.interface';

export interface TableConfiguration {
  columns: Column[];
  data?: Searchable[] | null;
  rowActions?: TableRowAction[];
  selectedIds?: string[];
  selectable?: boolean;
  footer?: boolean;
  sort?: {
    field?: string;
    direction?: SortDirection;
  };
}
