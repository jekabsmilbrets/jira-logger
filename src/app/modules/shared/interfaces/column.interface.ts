export interface Column {
  columnDef: string;
  header: string;
  headerToolTip?: string;
  sortable?: boolean;
  visible?: boolean;
  type?: string;
  cell: any;
  emptyCellValue?: string | null;
  index?: number;
}
