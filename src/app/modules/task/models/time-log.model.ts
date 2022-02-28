import { TimeLogInterface } from '@task/interfaces/time-log.interface';

export class TimeLog implements TimeLogInterface {
  private _uuid!: string;

  private _endTime!: number;
  private _startTime!: number;

  private _description!: string;

  constructor(data?: Partial<TimeLogInterface>) {
    Object.assign(this, data);
  }

  public get uuid(): string {
    return this._uuid;
  }

  public set uuid(value: string) {
    this._uuid = value;
  }

  public get startTime(): Date {
    return new Date(this._startTime);
  }

  public set startTime(value: Date) {
    this._startTime = value.getTime();
  }

  public get endTime(): Date {
    return new Date(this._endTime);
  }

  public set endTime(value: Date) {
    this._endTime = value.getTime();
  }

  public get description(): string {
    return this._description;
  }

  public set description(value: string) {
    this._description = value;
  }
}
