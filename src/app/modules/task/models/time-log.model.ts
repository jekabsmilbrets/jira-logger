import { TimeLogInterface } from '../interfaces/time-log.interface';

export class TimeLog implements TimeLogInterface {
  private _id!: number;

  private _endTime!: Date;
  private _startTime!: Date;

  private _description!: string;

  constructor(data?: Partial<TimeLogInterface>) {
    Object.assign(this, data);
  }

  public get id(): number {
    return this._id;
  }

  public set id(value: number) {
    this._id = value;
  }

  public get startTime(): Date {
    return this._startTime;
  }

  public set startTime(value: Date) {
    this._startTime = value;
  }

  public get endTime(): Date {
    return this._endTime;
  }

  public set endTime(value: Date) {
    this._endTime = value;
  }

  public get description(): string {
    return this._description;
  }

  public set description(value: string) {
    this._description = value;
  }
}
