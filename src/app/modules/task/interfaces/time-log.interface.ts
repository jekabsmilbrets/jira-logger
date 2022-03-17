import { ModelInterface } from '@core/interfaces/model.interface';

export interface TimeLogInterface extends ModelInterface {
  _startTime: Date;
  _endTime?: Date;

  _description?: string;
}
