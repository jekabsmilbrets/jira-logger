import { Base } from '@core/models/base.model';

export class Tag extends Base {
  public readonly isUsed: boolean = false;
  public readonly name!: string;

  constructor(
    data: Partial<Tag> = {},
  ) {
    super();
    Object.assign(
      this,
      data,
    );
  }
}
