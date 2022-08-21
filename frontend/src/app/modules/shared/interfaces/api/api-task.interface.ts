import { ApiBase } from '@core/interfaces/api/base.interface';

import { ApiTag } from '@shared/interfaces/api/api-tag.interface';

import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';


export interface ApiTask extends ApiBase {
  name: string;
  description?: string;

  lastTimeLog?: ApiTimeLog;

  timeLogs: ApiTimeLog[];
  timeLogged?: number;

  tags: ApiTag[];
}
