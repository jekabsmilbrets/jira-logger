import { HttpErrorResponse } from '@angular/common/http';
import { inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, concat, finalize, map, type Observable, of, switchMap, throwError, toArray } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

import type { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import type { ImportReport, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { ImportTaskInput } from '@tasks/interfaces/import-task-input.interface';

@Service()
export class TaskImportService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  public importData(
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
        switchMap((release: VoidFunction) => this.createMissingTags(request.tasks)
          .pipe(
            switchMap((createdTagCount: number) => this.importTasks(request.tasks)
              .pipe(
                map(({ createdTaskCount, createdTimeLogCount }) => ({
                  status: 'success',
                  createdTaskCount,
                  createdTagCount,
                  createdTimeLogCount,
                  warnings: request.warnings,
                  errors: [],
                } satisfies ImportReport)),
              )),
            catchError((error: HttpErrorResponse) => {
              release();
              return throwError(() => error);
            }),
            finalize(release),
          )),
      );
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading, this.constructor.name);
  }

  private createMissingTags(
    tasks: ImportTaskInput[],
  ): Observable<number> {
    const existingTagNames: Set<string> = new Set<string>(
      this.tagsService.tags().map((tag: Tag) => tag.name.trim().toLowerCase()),
    );
    const missingTagNames: string[] = [];

    tasks.forEach((task: ImportTaskInput) => {
      task.tags.forEach((tagName: string) => {
        const normalizedTagName: string = tagName.trim().toLowerCase();

        if (existingTagNames.has(normalizedTagName)) {
          return;
        }

        existingTagNames.add(normalizedTagName);
        missingTagNames.push(tagName);
      });
    });

    if (missingTagNames.length === 0) {
      return of(0);
    }

    return concat(
      ...missingTagNames.map((tagName: string) => this.tagsService.create(
        new Tag({ name: tagName }),
      )),
    )
      .pipe(
        toArray(),
        map((tags: Tag[]) => tags.length),
      );
  }

  private importTasks(
    tasks: ImportTaskInput[],
  ): Observable<{ createdTaskCount: number; createdTimeLogCount: number }> {
    if (tasks.length === 0) {
      return of({
        createdTaskCount: 0,
        createdTimeLogCount: 0,
      });
    }

    return concat(
      ...tasks.map((task: ImportTaskInput) => this.importTask(task)),
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
  ): Observable<{ createdTaskCount: number; createdTimeLogCount: number }> {
    const task: Task = new Task({
      name: input.name,
      description: input.description,
      tags: input.tags.map((tagName: string) => this.resolveTag(tagName)),
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

  private resolveTag(
    tagName: string,
  ): Tag {
    const existingTag: Tag | undefined = this.tagsService.tags().find(
      (tag: Tag) => tag.name.trim().toLowerCase() === tagName.trim().toLowerCase(),
    );

    if (!existingTag) {
      throw new Error(`Missing tag "${ tagName }" after tag creation.`);
    }

    return existingTag;
  }

  private findExistingDuplicateNames(
    tasks: ImportTaskInput[],
  ): string[] {
    const existingTaskNames: Set<string> = new Set<string>(
      this.tasksService.tasks().map((task: Task) => task.name.trim().toLowerCase()),
    );

    return tasks
      .map((task: ImportTaskInput) => task.name)
      .filter((taskName: string) => existingTaskNames.has(taskName.trim().toLowerCase()));
  }
}
