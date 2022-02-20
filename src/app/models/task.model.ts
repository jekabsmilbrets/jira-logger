import { TaskInterface } from '../interfaces/task.interface';

export class Task implements TaskInterface {
  private _createDate!: Date;

  private _name!: string;

  constructor(data?: Partial<TaskInterface>) {
    Object.assign(this, data);

    if (!this._createDate) {
      this.createDate = new Date();
    }
  }

  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
  }

  public get createDate(): Date {
    if (!this._createDate) {
      this.createDate = new Date();
    }

    return this._createDate;
  }

  public set createDate(value: Date) {
    this._createDate = value;
  }
}
