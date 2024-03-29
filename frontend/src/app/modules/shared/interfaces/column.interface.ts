export interface Column {
  columnDef: string;
  header: string;
  headerToolTip?: string;
  excludeFromLoop?: boolean;
  sortable?: boolean;
  hidden?: boolean;
  taskSynced?: any;
  sticky?: boolean;
  stickyEnd?: boolean;
  type?: string;
  cell: any;
  emptyCellValue?: string | null;
  index?: number;
  pipe?: string;
  isClickable?: boolean;
  disableFooterClick?: boolean;
  hasFooter?: boolean;
  footerCell?: any;
  cellClickType?: 'string' | 'readableTime' | 'concatenatedString';
  footerCellClickType?: 'readableTime' | 'concatenatedString';
}
