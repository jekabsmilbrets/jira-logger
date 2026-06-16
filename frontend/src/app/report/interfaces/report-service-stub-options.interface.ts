import { vi } from 'vitest';

import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import type { ReportMode } from '@report/enums/report-mode.enum';

export interface ReportServiceStubOptions {
  reportMode?: ReportMode;
  tags?: Tag[];
  date?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  showWeekends?: boolean;
  hideUnreportedTasks?: boolean;
  tasks?: Task[];
  columns?: Column[];
  reload?: ReturnType<typeof vi.fn>;
  onSetReportMode?: (value: ReportMode) => void;
  onSetTags?: (value: Tag[]) => void;
  onSetDate?: (value: Date | null) => void;
  onSetStartDate?: (value: Date | null) => void;
  onSetEndDate?: (value: Date | null) => void;
  onSetShowWeekends?: (value: boolean) => void;
  onSetHideUnreportedTasks?: (value: boolean) => void;
}
