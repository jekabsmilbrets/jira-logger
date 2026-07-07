export type ColumnValue = Date | string | number | null | undefined | (string | number)[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColumnCell = (...args: any[]) => ColumnValue;
export type ColumnClickValueType = 'string' | 'readableTime' | 'concatenatedString';
export type ColumnFooterClickValueType = 'readableTime' | 'concatenatedString';

export interface Column {
  columnDef: string;
  header: string;
  headerToolTip?: string;
  excludeFromLoop?: boolean;
  sortable?: boolean;
  hidden?: boolean;
  sticky?: boolean;
  stickyEnd?: boolean;
  type?: string;
  cell: ColumnCell;
  emptyCellValue?: string | null;
  index?: number;
  pipe?: string;
  isClickable?: boolean;
  disableFooterClick?: boolean;
  hasFooter?: boolean;
  footerCell?: ColumnCell;
  cellClickType?: ColumnClickValueType;
  footerCellClickType?: ColumnFooterClickValueType;
}
