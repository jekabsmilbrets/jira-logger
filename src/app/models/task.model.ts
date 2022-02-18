import { TaskInterface } from 'src/app/interfaces/task.interface';

export class Task implements TaskInterface {
  public name!: string;

  constructor(data?: Partial<TaskInterface>) {
    Object.assign(this, data)
  }
}
