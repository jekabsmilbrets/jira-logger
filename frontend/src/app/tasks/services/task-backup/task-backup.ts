import { HttpErrorResponse } from '@angular/common/http';
import { inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, concat, finalize, map, type Observable, of, switchMap, take, throwError, toArray } from 'rxjs';

import { LoaderState } from '@core/services/loader-state';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { Tags } from '@shared/services/tags';
import { Tasks } from '@shared/services/tasks';
import { TimeLogs } from '@shared/services/time-logs';

import type { ImportReport, TaskImportOutcome, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { ImportTagInput, ImportTaskInput } from '@tasks/interfaces/import-task-input.interface';

import { normalizeBackupKey } from './task-backup-normalization';
import { parseTaskBackup } from './task-backup-parser';
import { serializeTaskBackup } from './task-backup-serializer';
import { TaskBackupUnsupportedMetadata } from './task-backup-unsupported-metadata';
import { TaskImportExecutionPlan } from './task-import-execution-plan';

@Service()
export class TaskBackup {
  public readonly loaderStateService: LoaderState = inject(LoaderState);

  private readonly tagsService: Tags = inject(Tags);
  private readonly tasksService: Tasks = inject(Tasks);
  private readonly timeLogsService: TimeLogs = inject(TimeLogs);
  private readonly unsupportedMetadata: TaskBackupUnsupportedMetadata = new TaskBackupUnsupportedMetadata();

  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  public exportTasksForUser(
    tasks: Task[],
  ): string {
    return serializeTaskBackup(
      tasks,
      (task: Task) => this.unsupportedMetadata.readExportMetadata(task),
    );
  }

  public parseTaskImportRequest(
    json: string,
  ): TaskImportRequest {
    return parseTaskBackup(
      JSON.parse(json),
      this.tagsService.tags(),
      (task, name) => this.unsupportedMetadata.readImportMetadata(task, name),
    );
  }

  private applyTaskBackup(
    request: TaskImportRequest,
  ): Observable<ImportReport> {
    const duplicateErrors: string[] = this.findExistingDuplicateNames(request.tasks);

    if (duplicateErrors.length > 0) {
      return of({
        status: 'blocked',
        createdTaskCount: 0,
        createdTagCount: 0,
        createdTimeLogCount: 0,
        warnings: request.warnings,
        errors: duplicateErrors,
      });
    }

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => this.createImportExecutionPlan(request.tasks)
          .pipe(
            switchMap((executionPlan: TaskImportExecutionPlan) => this.importTasks(request.tasks, executionPlan)
              .pipe(
                map(({ createdTaskCount, createdTimeLogCount }) => ({
                  status: 'success',
                  createdTaskCount,
                  createdTagCount: executionPlan.createdTagCount,
                  createdTimeLogCount,
                  warnings: request.warnings,
                  errors: [],
                } satisfies ImportReport)),
                switchMap((report: ImportReport) => this.tasksService.list()
                  .pipe(
                    take(1),
                    map(() => report),
                  )),
              )),
            catchError((error: HttpErrorResponse) => {
              release();
              return throwError(() => error);
            }),
            finalize(release),
          )),
      );
  }

  public applyTaskBackupForUser(
    request: TaskImportRequest,
  ): Observable<TaskImportOutcome> {
    return this.applyTaskBackup(request)
      .pipe(
        map((report: ImportReport) => ({
          message: this.formatImportReport(report),
          duration: report.status === 'success' ? 7000 : 9000,
        })),
      );
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'TaskBackup',
    );
  }

  private formatImportReport(
    report: ImportReport,
  ): string {
    if (report.status === 'blocked') {
      return report.errors.join(' ');
    }

    const segments: string[] = [
      this.formatCountSegment(report.createdTaskCount, 'Imported', 'task'),
      this.formatCountSegment(report.createdTimeLogCount, '', 'time log').trim(),
    ];

    if (report.warnings.length > 0) {
      segments.push(this.formatCountSegment(report.warnings.length, '', 'warning').trim());
    }

    if (report.createdTagCount > 0) {
      segments.push(this.formatCountSegment(report.createdTagCount, 'created', 'tag'));
    }

    return segments.join(', ') + '.';
  }

  private createImportExecutionPlan(
    tasks: ImportTaskInput[],
  ): Observable<TaskImportExecutionPlan> {
    return TaskImportExecutionPlan.fromTasks(tasks).createMissingTags(this.tagsService);
  }

  private importTasks(
    tasks: ImportTaskInput[],
    executionPlan: TaskImportExecutionPlan,
  ): Observable<{ createdTaskCount: number; createdTimeLogCount: number }> {
    if (tasks.length === 0) {
      return of({
        createdTaskCount: 0,
        createdTimeLogCount: 0,
      });
    }

    return concat(
      ...tasks.map((task: ImportTaskInput) => this.importTask(task, executionPlan)),
    )
      .pipe(
        toArray(),
        map((reports: { createdTaskCount: number; createdTimeLogCount: number }[]) => reports.reduce(
          (summary: { createdTaskCount: number; createdTimeLogCount: number }, report) => ({
            createdTaskCount: summary.createdTaskCount + report.createdTaskCount,
            createdTimeLogCount: summary.createdTimeLogCount + report.createdTimeLogCount,
          }),
          {
            createdTaskCount: 0,
            createdTimeLogCount: 0,
          },
        )),
      );
  }

  private importTask(
    input: ImportTaskInput,
    executionPlan: TaskImportExecutionPlan,
  ): Observable<{ createdTaskCount: number; createdTimeLogCount: number }> {
    const task: Task = new Task({
      name: input.name,
      description: input.description,
      tags: input.tags.map((tag: ImportTagInput) => executionPlan.resolveTag(tag)),
      timeLogs: [],
    });

    return this.tasksService.create(task)
      .pipe(
        switchMap((createdTask: Task) => {
          if (input.timeLogs.length === 0) {
            return of({
              createdTaskCount: 1,
              createdTimeLogCount: 0,
            });
          }

          return concat(
            ...input.timeLogs.map((timeLogInput) => this.timeLogsService.create(
              createdTask,
              new TimeLog({
                startTime: new Date(timeLogInput.startTime),
                endTime: timeLogInput.endTime === undefined ? undefined : new Date(timeLogInput.endTime),
                description: timeLogInput.description,
              }),
            )),
          )
            .pipe(
              toArray(),
              map((timeLogs: TimeLog[]) => ({
                createdTaskCount: 1,
                createdTimeLogCount: timeLogs.length,
              })),
            );
        }),
      );
  }

  private findExistingDuplicateNames(
    tasks: ImportTaskInput[],
  ): string[] {
    const existingTaskNames: Set<string> = this.existingTaskNames();

    return tasks
      .map((task: ImportTaskInput) => task.name)
      .filter((taskName: string) => existingTaskNames.has(normalizeBackupKey(taskName)));
  }

  private existingTaskNames(): Set<string> {
    return new Set<string>(
      this.tasksService.allTasks().map((task: Task) => normalizeBackupKey(task.name)),
    );
  }

  private formatCountSegment(
    count: number,
    prefix: string,
    noun: string,
  ): string {
    return `${ prefix ? `${ prefix } ` : '' }${ count } ${ noun }${ count === 1 ? '' : 's' }`;
  }
}
