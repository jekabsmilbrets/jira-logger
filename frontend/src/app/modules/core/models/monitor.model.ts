export class Monitor {
  public readonly time!: Date;
  public readonly message!: string;

  constructor(data: Partial<Monitor> = {}) {
    Object.assign(this, data);
  }
}
