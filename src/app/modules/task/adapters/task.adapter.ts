import { adaptTimeLogs } from '@task/adapters/time-log.adapter';
import { TaskInterface } from '@task/interfaces/task.interface';
import { Task }          from '@task/models/task.model';

export const adaptTask = (dbTask: TaskInterface): Task => new Task(
  {
    uuid: dbTask._uuid,
    name: dbTask._name,
    createDate: new Date(dbTask._createDate),
    lastTimeLogId: dbTask._lastTimeLogId,
    timeLogs: adaptTimeLogs(dbTask._timeLogs),
    description: dbTask._description,
    timeLogged: dbTask._timeLogged,
    tags: dbTask._tags,
  },
);

export const adaptTasks = (dbTasks: TaskInterface[]): Task[] => dbTasks.map(
  (dbTask: TaskInterface) => adaptTask(dbTask),
);

