import { inject, Service } from '@angular/core';

import { type Observable, of, switchMap, take } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

@Service()
export class WorkLogService {
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  public toggleTaskWorkLog(
    task: Task,
  ): Observable<Task[]> {
    return this.runWorkLogToggle(task)
      .pipe(
        switchMap(() => this.tasksService.list().pipe(take(1))),
      );
  }

  private runWorkLogToggle(
    task: Task,
  ): Observable<unknown> {
    if (!task.isTimeLogRunning) {
      return this.timeLogsService.start(task);
    }

    return task.lastTimeLog instanceof TimeLog ?
      this.timeLogsService.stop(task) :
      of(undefined);
  }
}
