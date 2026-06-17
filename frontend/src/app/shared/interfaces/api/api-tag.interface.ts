import type { ApiBase } from '@core/interfaces/api/base.interface';

export interface ApiTag extends ApiBase {
  isUsed: boolean;
  name: string;
}
