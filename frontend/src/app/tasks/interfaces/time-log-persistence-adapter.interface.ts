import type { Observable } from 'rxjs';

import type { Task } from '@shared/models/task.model';
import type { TimeLog } from '@shared/models/time-log.model';

export interface TimeLogPersistenceAdapter {
  list(task: Task): Observable<TimeLog[]>;

  create(task: Task, timeLog: TimeLog): Observable<TimeLog>;

  update(task: Task, timeLog: TimeLog): Observable<TimeLog>;

  delete(task: Task, timeLog: TimeLog): Observable<void>;
}
