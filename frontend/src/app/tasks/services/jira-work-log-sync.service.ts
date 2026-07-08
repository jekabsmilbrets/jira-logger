import { inject, Service } from '@angular/core';

import { catchError, defer, map, type Observable, of } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import type { JiraWorkLogSyncOutcome } from '@tasks/interfaces/jira-work-log-sync-outcome.interface';
import { type WorkLogInterruptionResult,WorkLogService } from '@tasks/services/work-log.service';

@Service()
export class JiraWorkLogSyncService {
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly workLogService: WorkLogService = inject(WorkLogService);

  public syncReportDate(
    task: Task,
    date: Date,
  ): Observable<JiraWorkLogSyncOutcome> {
    const syncDateToJiraApi$: Observable<boolean> = defer(() => this.tasksService.syncDateToJiraApi(
      task,
      date,
    ));

    return this.workLogService.runWithWorkLogInterruption(
      task,
      this.runSync(task, syncDateToJiraApi$),
    )
      .pipe(
        map((interruptionResult: WorkLogInterruptionResult<JiraWorkLogSyncOutcome>) =>
          this.applyInterruptionResult(interruptionResult)),
        catchError((error: unknown) => of(this.failedOutcome(task, error))),
      );
  }

  private runSync(
    task: Task,
    syncDateToJiraApi$: Observable<boolean>,
  ): Observable<JiraWorkLogSyncOutcome> {
    return syncDateToJiraApi$
      .pipe(
        map(() => this.syncedOutcome(task)),
        catchError((error: unknown) => of(this.failedOutcome(task, error))),
      );
  }

  private applyInterruptionResult(
    interruptionResult: WorkLogInterruptionResult<JiraWorkLogSyncOutcome>,
  ): JiraWorkLogSyncOutcome {
    if (interruptionResult.continued || !interruptionResult.result.reloadReport) {
      return interruptionResult.result;
    }

    return this.partialSyncOutcome();
  }

  private syncedOutcome(
    task: Task,
  ): JiraWorkLogSyncOutcome {
    return {
      reloadReport: true,
      message: `Task "${ task.name }" synced successfully!`,
      duration: 5000,
    };
  }

  private partialSyncOutcome(): JiraWorkLogSyncOutcome {
    return {
      reloadReport: true,
      message: 'Synced to Jira, but Work Log could not be continued.',
      duration: null,
    };
  }

  private failedOutcome(
    task: Task,
    error: unknown,
  ): JiraWorkLogSyncOutcome {
    const errors: unknown = (error as { error?: { errors?: unknown } })?.error?.errors;
    const details: string = Array.isArray(errors) ? errors.join(', ') : '';

    return {
      reloadReport: false,
      message: `Task "${ task.name }" failed synced! ${ details }`,
      duration: 5000,
    };
  }
}
