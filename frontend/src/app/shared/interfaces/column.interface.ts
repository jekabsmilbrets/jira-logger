export interface Column {
  columnDef: string;
  header: string;
  headerToolTip?: string;
  excludeFromLoop?: boolean;
  sortable?: boolean;
  hidden?: boolean;
  taskSynced?: CallableFunction;
  sticky?: boolean;
  stickyEnd?: boolean;
  type?: string;
  cell: CallableFunction;
  emptyCellValue?: string | null;
  index?: number;
  pipe?: string;
  isClickable?: boolean;
  disableFooterClick?: boolean;
  hasFooter?: boolean;
  footerCell?: CallableFunction;
  cellClickType?: 'string' | 'readableTime' | 'concatenatedString';
  footerCellClickType?: 'readableTime' | 'concatenatedString';
}
