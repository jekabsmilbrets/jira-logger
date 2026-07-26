import { effect, inject, injectAsync, Service, signal, type WritableSignal } from '@angular/core';

import { catchError, concatMap, from, map, type Observable, of, switchMap, take, toArray } from 'rxjs';

import { Storage } from '@core/services/storage';

import { adaptTaskRequest } from '@shared/adapters/task.adapter';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ApiRequest } from '@shared/services/api-request';
import type { ErrorDialog } from '@shared/services/error-dialog';
import { Tags } from '@shared/services/tags';
import { Tasks } from '@shared/services/tasks';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

import { DEFAULT_CRITERIA, RESULT_LIMITS } from '@tasks/constants/jira-api-task-intake.constant';
import type {
  JiraApiTaskIntakeCriteria,
  JiraApiTaskIntakeOutcome,
  JiraApiTaskIntakeRow,
  JiraApiTaskIntakeSearchResult,
} from '@tasks/interfaces/jira-api-task-intake.interface';

interface JiraApiTaskCandidate {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  updated: string | null;
}

interface JiraApiTaskIntakeResponse {
  data: JiraApiTaskCandidate[];
  meta: {
    limit: number;
    truncated: boolean;
  };
}

interface JiraApiTaskCreateResult {
  candidate: JiraApiTaskIntakeRow;
  success: boolean;
}

@Service()
export class JiraApiTaskIntake {
  private readonly apiRequestService: ApiRequest = inject(ApiRequest);
  private readonly storageService: Storage = inject(Storage);
  private readonly tagsService: Tags = inject(Tags);
  private readonly tasksService: Tasks = inject(Tasks);
  private readonly taskResource: ResourceRequestHandle = this.apiRequestService.resource('task');
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialog> = injectAsync(
    () => import('@shared/services/error-dialog')
      .then((module) => module.ErrorDialog),
  );

  private readonly criteriaModel: WritableSignal<WritableSignal<JiraApiTaskIntakeCriteria> | undefined> = signal(undefined);
  private readonly isHydrated: WritableSignal<boolean> = signal(false);
  private readonly storageKey: IDBValidKey = 'jira-task-import-criteria:v1';
  private readonly storageName: string = 'settings';

  public constructor() {
    effect(() => {
      const criteriaModel: WritableSignal<JiraApiTaskIntakeCriteria> | undefined = this.criteriaModel();

      if (!this.isHydrated() || !criteriaModel) {
        return;
      }

      this.storageService.create(
        this.storageKey,
        criteriaModel(),
        this.storageName,
      )
        .pipe(
          take(1),
          catchError(() => of(undefined)),
        )
        .subscribe();
    });
  }

  public restoreCriteria(
    criteriaModel: WritableSignal<JiraApiTaskIntakeCriteria>,
  ): void {
    this.isHydrated.set(false);
    this.criteriaModel.set(criteriaModel);
    this.storageService.read<unknown>(this.storageKey, this.storageName)
      .pipe(
        take(1),
        catchError(() => of(undefined)),
      )
      .subscribe((stored: unknown) => {
        criteriaModel.set(this.normalizeCriteria(stored));
        this.isHydrated.set(true);
      });
  }

  public findCandidates(
    criteria: JiraApiTaskIntakeCriteria,
  ): Observable<JiraApiTaskIntakeSearchResult> {
    const normalizedCriteria: JiraApiTaskIntakeCriteria = this.normalizeCriteria(criteria);
    const query: URLSearchParams = new URLSearchParams({
      assignedToMe: String(normalizedCriteria.assignedToMe),
      reportedByMe: String(normalizedCriteria.reportedByMe),
      resolution: normalizedCriteria.resolution,
      limit: String(normalizedCriteria.limit),
    });

    if (normalizedCriteria.projects.length > 0) {
      query.set('projects', normalizedCriteria.projects.join(','));
    }

    return this.taskResource.request<JiraApiTaskIntakeResponse>(
      `/jira/missing?${ query.toString() }`,
      'get',
      null,
      (error: unknown) => this.processError(error),
    )
      .pipe(map((response: JiraApiTaskIntakeResponse): JiraApiTaskIntakeSearchResult => ({
        rows: response.data.map((candidate: JiraApiTaskCandidate) => this.toRow(candidate)),
        meta: response.meta,
      })));
  }

  public createTasks(
    candidates: JiraApiTaskIntakeRow[],
  ): Observable<JiraApiTaskIntakeOutcome> {
    if (candidates.length === 0) {
      return of({
        status: 'successful',
        createdCount: 0,
        failedCandidates: [],
      });
    }

    return from(candidates)
      .pipe(
        concatMap((candidate: JiraApiTaskIntakeRow) => this.taskResource.request(
          '',
          'post',
          adaptTaskRequest(this.toTask(candidate)),
        )
          .pipe(
            map((): JiraApiTaskCreateResult => ({ candidate, success: true })),
            catchError(() => of({ candidate, success: false })),
          )),
        toArray(),
        switchMap((results: JiraApiTaskCreateResult[]) => this.tasksService.list()
          .pipe(
            take(1),
            map(() => this.toOutcome(results)),
          )),
      );
  }

  private normalizeCriteria(
    value: unknown,
  ): JiraApiTaskIntakeCriteria {
    if (typeof value !== 'object' || value === null) {
      return { ...DEFAULT_CRITERIA };
    }

    const criteria: Partial<JiraApiTaskIntakeCriteria> = value as Partial<JiraApiTaskIntakeCriteria>;
    const isStoredCriteria: boolean = typeof criteria.assignedToMe === 'boolean'
      && typeof criteria.reportedByMe === 'boolean'
      && ['all', 'unresolved', 'resolved'].includes(criteria.resolution ?? '')
      && Array.isArray(criteria.projects)
      && criteria.projects.every((project: unknown) =>
        typeof project === 'string' && /^[A-Z][A-Z0-9_]{1,9}$/.test(project));

    if (!isStoredCriteria) {
      return { ...DEFAULT_CRITERIA };
    }

    return {
      assignedToMe: criteria.assignedToMe as boolean,
      reportedByMe: criteria.reportedByMe as boolean,
      resolution: criteria.resolution as JiraApiTaskIntakeCriteria['resolution'],
      projects: [...(criteria.projects as string[])],
      limit: this.normalizeLimit(criteria.limit),
    };
  }

  private normalizeLimit(
    limit: unknown,
  ): number {
    return typeof limit === 'number' && RESULT_LIMITS.includes(limit) ?
      limit :
      DEFAULT_CRITERIA.limit;
  }

  private toRow(
    candidate: JiraApiTaskCandidate,
  ): JiraApiTaskIntakeRow {
    const updated: Date | null = candidate.updated ? new Date(candidate.updated) : null;

    return {
      id: candidate.key,
      key: candidate.key,
      summary: candidate.summary,
      status: candidate.status,
      issueType: candidate.issueType,
      updated: updated && !Number.isNaN(updated.getTime()) ? updated : null,
      tags: this.defaultTags(candidate),
      intakeStatus: '',
    };
  }

  private defaultTags(
    candidate: JiraApiTaskCandidate,
  ): Tag[] {
    const expectedName: string = candidate.issueType.toLowerCase() === 'bug' ? 'opex' : 'capex';
    const tag: Tag | undefined = this.tagsService.tags().find(
      (availableTag: Tag) => availableTag.name.toLowerCase() === expectedName,
    );

    return tag ? [tag] : [];
  }

  private toTask(
    candidate: JiraApiTaskIntakeRow,
  ): Task {
    return new Task({
      name: candidate.key,
      description: '',
      tags: candidate.tags,
      timeLogs: [],
    });
  }

  private toOutcome(
    results: JiraApiTaskCreateResult[],
  ): JiraApiTaskIntakeOutcome {
    const failedCandidates: JiraApiTaskIntakeRow[] = results
      .filter((result: JiraApiTaskCreateResult) => !result.success)
      .map((result: JiraApiTaskCreateResult) => ({
        ...result.candidate,
        intakeStatus: 'Import failed',
      }));
    const createdCount: number = results.length - failedCandidates.length;

    return {
      status: failedCandidates.length === 0 ?
        'successful' :
        createdCount === 0 ? 'failed' : 'partial',
      createdCount,
      failedCandidates,
    };
  }

  private processError(
    error: unknown,
  ): Observable<never> {
    return openLoadErrorDialog(
      this.loadErrorDialogService,
      error,
      this.tasksService.tasks(),
    );
  }
}
