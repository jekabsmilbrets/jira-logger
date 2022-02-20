import { ModelInterface } from '@core/interfaces/model.interface';

export interface TimeLogInterface extends ModelInterface {
  startTime: Date;
  endTime?: Date;

  description?: string;
}
