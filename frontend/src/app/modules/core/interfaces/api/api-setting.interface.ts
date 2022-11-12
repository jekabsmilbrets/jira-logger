import { ApiBase } from '@core/interfaces/api/base.interface';


export interface ApiSetting extends ApiBase {
  name: string;
  value: any;
}
