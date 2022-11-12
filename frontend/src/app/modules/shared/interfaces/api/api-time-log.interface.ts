import { ApiBase } from '@core/interfaces/api/base.interface';


export interface ApiTimeLog extends ApiBase {
  startTime: Date;
  endTime?: Date;

  description?: string;
}
