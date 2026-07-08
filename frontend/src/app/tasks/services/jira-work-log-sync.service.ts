import { inject, Service } from '@angular/core';

import { catchError, defer, map, type Observable, of } from 'rxjs';

import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';

import type { JiraWorkLogSyncOutcome } from '@tasks/interfaces/jira-work-log-sync-outcome.interface';
import { type WorkLogInterruptionResult, WorkLogService } from '@tasks/services/work-log.service';

import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

@Service()
export class JiraWorkLogSyncService {
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);
  private readonly taskResource: ResourceRequestHandle = inject(ApiRequestService).resource('task');
  private readonly workLogService: WorkLogService = inject(WorkLogService);

  public syncReportDate(
    task: Task,
    date: Date,
  ): Observable<JiraWorkLogSyncOutcome> {
    const syncDateToJiraApi$: Observable<boolean> = defer(() => this.syncDateToJiraApi(
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

  private syncDateToJiraApi(
    task: Task,
    date: Date,
  ): Observable<boolean> {
    const formattedDate: string = this.reportDateCalendarService.formatJiraSyncDate(date);

    return this.taskResource.request<void>(
      `/${ task.id }/${ formattedDate }`,
      'post',
    )
      .pipe(
        map(() => true),
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
