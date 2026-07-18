export interface TaskListFilter {
  hideUnreported?: boolean;
  date?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  tags?: string[];
  name?: string;
}
