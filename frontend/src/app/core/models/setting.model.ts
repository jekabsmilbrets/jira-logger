import { Base } from '@core/models/base.model';

export class Setting extends Base {
  public name!: string;
  public value!: string;

  constructor(
    data: Partial<Setting> = {},
  ) {
    super();
    Object.assign(
      this,
      data,
    );
  }
}
