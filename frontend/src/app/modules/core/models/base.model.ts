export class Base {
  private _id!: string;
  private _createdAt!: number;
  private _updatedAt!: number | undefined;

  public get id(): string {
    return this._id;
  }

  public set id(value: string) {
    this._id = value;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt);
  }

  public set createdAt(value: Date) {
    this._createdAt = value?.getTime();
  }

  public get updatedAt(): Date | undefined {
    return this._updatedAt ? new Date(this._updatedAt) : undefined;
  }

  public set updatedAt(value: Date | undefined) {
    this._updatedAt = value?.getTime();
  }
}
