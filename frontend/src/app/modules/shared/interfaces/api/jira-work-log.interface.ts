import { ApiBase } from '@core/interfaces/api/base.interface';

export interface ApiJiraWorkLog extends ApiBase {
  workLogId: string;
  description: string;
  startTime: Date;
  timeSpentSeconds: number;
}
