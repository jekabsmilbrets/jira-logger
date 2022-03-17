import { Searchable } from '@shared/interfaces/searchable.interface';

export class TimeLog implements Searchable {
  private _uuid!: string;
  private _endTime!: number | undefined;
  private _startTime!: number;
  private _description!: string;

  constructor(data?: Partial<TimeLog>) {
    Object.assign(this, data);
  }

  public get uuid(): string {
    return this._uuid;
  }

  public set uuid(value: string) {
    this._uuid = value;
  }

  public get endTime(): Date | undefined {
    return this._endTime ? new Date(this._endTime) : undefined;
  }

  public set endTime(value: Date | undefined) {
    this._endTime = value?.getTime();
  }

  public get startTime(): Date {
    return new Date(this._startTime);
  }

  public set startTime(value: Date) {
    this._startTime = value?.getTime();
  }

  public get description(): string {
    return this._description;
  }

  public set description(value: string) {
    this._description = value;
  }

  public get date(): Date {
    return this.startTime;
  }

  public get year(): number {
    return this.startTime?.getFullYear();
  }

  public get month(): number {
    return this.startTime?.getMonth() + 1;
  }

  public get day(): number {
    return this.startTime?.getDate();
  }

  public get hour(): number {
    return this.startTime?.getHours();
  }

  public get minute(): number {
    return this.startTime?.getMinutes();
  }

  public get second(): number {
    return this.startTime?.getSeconds();
  }

  public timeLogged(): number {
    if (!this.endTime || !this.startTime) {
      return 0;
    }

    return Math.ceil(
      ((this.endTime?.getTime() - this.startTime.getTime()) / 1000),
    );
  }
}
