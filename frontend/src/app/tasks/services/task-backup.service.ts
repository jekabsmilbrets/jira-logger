import { HttpErrorResponse } from '@angular/common/http';
import { inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, concat, finalize, map, type Observable, of, switchMap, take, throwError, toArray } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

import type { LoadableInitializer } from '@shared/interfaces/loadable-initializer.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { stringifyTaskBackup } from '@tasks/adapters/task-backup-export.adapter';
import { adaptTaskImportRequest } from '@tasks/adapters/task-backup-import.adapter';
import type { ImportReport, TaskImportOutcome, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { ImportTagInput, ImportTaskInput } from '@tasks/interfaces/import-task-input.interface';
import { TaskBackupUnsupportedMetadataService } from '@tasks/services/task-backup-unsupported-metadata.service';
import { normalizeBackupKey } from '@tasks/utilities/task-backup-normalization.utility';

@Service()
export class TaskBackupService implements LoadableInitializer {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);
  private readonly unsupportedMetadataService: TaskBackupUnsupportedMetadataService = inject(TaskBackupUnsupportedMetadataService);

  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  public exportTasksForUser(
    tasks: Task[],
  ): string {
    return stringifyTaskBackup(
      tasks,
      (task: Task) => this.unsupportedMetadataService.readExportMetadata(task),
    );
  }

  public parseTaskImportRequest(
    json: string,
  ): TaskImportRequest {
    return adaptTaskImportRequest(
      JSON.parse(json),
      this.tagsService.tags(),
      (task, name) => this.unsupportedMetadataService.readImportMetadata(task, name),
    );
  }

  public applyTaskBackup(
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
      this.constructor.name,
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

class TaskImportExecutionPlan {
  public static fromTasks(
    tasks: ImportTaskInput[],
  ): TaskImportExecutionPlan {
    const tagsByName: Map<string, Tag> = new Map<string, Tag>();
    const missingTags: ImportTagInput[] = [];
    const plannedTagNames: Set<string> = new Set<string>();

    tasks.forEach((task: ImportTaskInput) => {
      task.tags.forEach((tag: ImportTagInput) => {
        if (tag.existingTagId) {
          tagsByName.set(normalizeBackupKey(tag.name), new Tag({
            id: tag.existingTagId,
            name: tag.name,
          }));
        }
      });
    });

    tasks.forEach((task: ImportTaskInput) => {
      task.tags.forEach((tag: ImportTagInput) => {
        const normalizedTagName: string = normalizeBackupKey(tag.name);

        if (tag.existingTagId || tagsByName.has(normalizedTagName) || plannedTagNames.has(normalizedTagName)) {
          return;
        }

        plannedTagNames.add(normalizedTagName);
        missingTags.push(tag);
      });
    });

    return new TaskImportExecutionPlan(tagsByName, missingTags, 0);
  }

  private constructor(
    private readonly tagsByName: Map<string, Tag>,
    private readonly missingTags: ImportTagInput[],
    public readonly createdTagCount: number,
  ) {}

  public createMissingTags(
    tagsService: TagsService,
  ): Observable<TaskImportExecutionPlan> {
    if (this.missingTags.length === 0) {
      return of(this);
    }

    return concat(
      ...this.missingTags.map((tag: ImportTagInput) => tagsService.create(new Tag({ name: tag.name }))),
    )
      .pipe(
        toArray(),
        map((createdTags: Tag[]) => {
          const tagsByName: Map<string, Tag> = new Map<string, Tag>(this.tagsByName);
          createdTags.forEach((tag: Tag) => tagsByName.set(normalizeBackupKey(tag.name), tag));

          return new TaskImportExecutionPlan(tagsByName, [], createdTags.length);
        }),
      );
  }

  public resolveTag(
    tag: ImportTagInput,
  ): Tag {
    const existingTag: Tag | undefined = this.tagsByName.get(normalizeBackupKey(tag.name));

    if (!existingTag) {
      throw new Error(`Missing tag "${ tag.name }" after tag creation.`);
    }

    return existingTag;
  }
}
