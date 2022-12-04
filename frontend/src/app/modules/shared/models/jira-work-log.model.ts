import { Base } from '@core/models/base.model';

import { Searchable } from '@shared/interfaces/searchable.interface';


export class JiraWorkLog extends Base implements Searchable {
  public readonly workLogId!: string;
  public readonly description!: string;
  public readonly startTime!: Date;
  public readonly timeSpentSeconds!: number;

  constructor(data: Partial<JiraWorkLog> = {}) {
    super();
    Object.assign(this, data);
  }
}
