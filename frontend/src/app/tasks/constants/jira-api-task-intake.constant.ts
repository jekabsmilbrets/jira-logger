import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableRowAction } from '@shared/interfaces/table-row-action.interface';

import type {
  JiraApiTaskIntakeCriteria,
  JiraApiTaskIntakeRow,
} from '@tasks/interfaces/jira-api-task-intake.interface';

export const RESULT_LIMITS: number[] = [
  50,
  100,
  150,
  200,
];

export const DEFAULT_CRITERIA: JiraApiTaskIntakeCriteria = {
  assignedToMe: true,
  reportedByMe: false,
  resolution: 'unresolved',
  projects: [],
  limit: 50,
};

export const RESULT_COLUMNS: Column[] = [
  {
    columnDef: 'key',
    header: 'Key',
    sortable: true,
    cell: (row: JiraApiTaskIntakeRow) => row.key,
  },
  {
    columnDef: 'intakeStatus',
    header: 'Intake status',
    cell: (row: JiraApiTaskIntakeRow) => row.intakeStatus,
  },
  {
    columnDef: 'summary',
    header: 'Summary',
    sortable: true,
    cell: (row: JiraApiTaskIntakeRow) => row.summary,
  },
  {
    columnDef: 'status',
    header: 'Status',
    sortable: true,
    cell: (row: JiraApiTaskIntakeRow) => row.status,
  },
  {
    columnDef: 'issueType',
    header: 'Issue type',
    sortable: true,
    cell: (row: JiraApiTaskIntakeRow) => row.issueType,
  },
  {
    columnDef: 'updated',
    header: 'Updated',
    sortable: true,
    pipe: 'date',
    dateFormat: 'yyyy-MM-dd HH:mm',
    cell: (row: JiraApiTaskIntakeRow) => row.updated,
  },
];

export const EDIT_TAGS_ACTION: TableRowAction = {
  id: 'edit-tags',
  columnDef: 'editTags',
  header: 'Tags',
  icon: 'label',
  ariaLabel: 'Edit Jira task tags',
  cell: (row: Searchable) => (row as JiraApiTaskIntakeRow).tags.map((tag) => tag.name).join(', ') || 'No tags',
};
