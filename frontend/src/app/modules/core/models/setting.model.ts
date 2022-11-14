import { Base } from '@core/models/base.model';


export class Setting extends Base {
  public name!: string;
  public value!: any;

  constructor(data: Partial<Setting> = {}) {
    super();
    Object.assign(this, data);
  }
}
