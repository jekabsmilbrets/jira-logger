import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';

export type ReportSettingsIntent =
  | { type: 'set-report-mode'; reportMode: ReportMode }
  | { type: 'set-tags'; tags: Tag[] }
  | { type: 'set-date'; date: Date | null }
  | { type: 'set-start-date'; startDate: Date | null }
  | { type: 'set-end-date'; endDate: Date | null }
  | { type: 'set-show-weekends'; showWeekends: boolean }
  | { type: 'set-hide-unreported-tasks'; hideUnreportedTasks: boolean };
