export interface TaskListFilter {
  hideUnreported?: boolean;
  date?: Date | null;
  endDate?: Date | null;
  startDate?: Date | null;
  tags?: string[];
}
