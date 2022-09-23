export interface Column {
  columnDef: string;
  header: string;
  headerToolTip?: string;
  sortable?: boolean;
  visible?: boolean;
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
}
