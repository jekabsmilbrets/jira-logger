import type { ThemePalette } from '@angular/material/core';

import type { Searchable } from '@shared/interfaces/searchable.interface';

export interface TableRowAction {
  id: string;
  columnDef: string;
  header: string;
  icon: string;
  ariaLabel: string;
  color?: ThemePalette;
  tooltip?: string;
  isDisabled?: (row: Searchable) => boolean;
  confirmLabel?: (row: Searchable) => string;
}
