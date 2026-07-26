import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { Tag } from '@shared/models/tag.model';

export type JiraApiTaskResolution = 'all' | 'unresolved' | 'resolved';

export interface JiraApiTaskIntakeCriteria {
  assignedToMe: boolean;
  reportedByMe: boolean;
  resolution: JiraApiTaskResolution;
  projects: string[];
  limit: number;
}

export interface JiraApiTaskIntakeRow extends Searchable {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  updated: Date | null;
  tags: Tag[];
  intakeStatus: '' | 'Import failed';
}

export interface JiraApiTaskIntakeSearchResult {
  rows: JiraApiTaskIntakeRow[];
  meta: {
    limit: number;
    truncated: boolean;
  };
}

export type JiraApiTaskIntakeStatus = 'successful' | 'partial' | 'failed';

export interface JiraApiTaskIntakeOutcome {
  status: JiraApiTaskIntakeStatus;
  createdCount: number;
  failedCandidates: JiraApiTaskIntakeRow[];
}
