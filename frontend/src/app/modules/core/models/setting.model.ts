import { Base } from '@core/models/base.model';


export class Setting extends Base {
  public readonly name!: string;
  public readonly value!: any;

  constructor(data: Partial<Setting> = {}) {
    super();
    Object.assign(this, data);
  }
}
