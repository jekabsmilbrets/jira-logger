export interface TimeLogInterface {
  id: number;

  startTime: Date;
  endTime?: Date;

  description?: string;
}
