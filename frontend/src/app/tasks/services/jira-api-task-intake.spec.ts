import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Storage } from '@core/services/storage';

import { Tag } from '@shared/models/tag.model';
import { ApiRequest } from '@shared/services/api-request';
import { ErrorDialog } from '@shared/services/error-dialog';
import { Tags } from '@shared/services/tags';
import { Tasks } from '@shared/services/tasks';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { DEFAULT_CRITERIA } from '@tasks/constants/jira-api-task-intake.constant';
import type { JiraApiTaskIntakeCriteria, JiraApiTaskIntakeRow } from '@tasks/interfaces/jira-api-task-intake.interface';

import { JiraApiTaskIntake } from './jira-api-task-intake';

describe('JiraApiTaskIntake', () => {
  const opex = new Tag({ id: 'opex-id', name: 'OPEX' });
  const capex = new Tag({ id: 'capex-id', name: 'capex' });
  const tags = signal<Tag[]>([opex, capex]);
  const tasks = signal([]);
  const apiRequestService = createResourceRequestHandleMock();
  const storageService = {
    read: vi.fn(),
    create: vi.fn(),
  };
  const tasksService = {
    tasks: tasks.asReadonly(),
    list: vi.fn(),
  };
  const errorDialogService = {
    openDialog: vi.fn(() => of(undefined)),
  };
  let service: JiraApiTaskIntake;

  beforeEach(() => {
    apiRequestService.request.mockReset();
    apiRequestService.resource.mockClear();
    storageService.read.mockReset().mockReturnValue(of(undefined));
    storageService.create.mockReset().mockReturnValue(of(undefined));
    tasksService.list.mockReset().mockReturnValue(of([]));
    errorDialogService.openDialog.mockReset().mockReturnValue(of(undefined));
    tags.set([opex, capex]);

    TestBed.configureTestingModule({
      providers: [
        JiraApiTaskIntake,
        { provide: ApiRequest, useValue: apiRequestService },
        { provide: Storage, useValue: storageService },
        { provide: Tags, useValue: { tags: tags.asReadonly() } },
        { provide: Tasks, useValue: tasksService },
        { provide: ErrorDialog, useValue: errorDialogService },
      ],
    });
    service = TestBed.inject(JiraApiTaskIntake);
  });

  it('restores legacy criteria, normalizes its limit, and persists later changes', () => {
    storageService.read.mockReturnValueOnce(of({
      assignedToMe: false,
      reportedByMe: true,
      resolution: 'all',
      projects: ['ABC'],
    }));
    const criteria = signal<JiraApiTaskIntakeCriteria>({ ...DEFAULT_CRITERIA });

    service.restoreCriteria(criteria);
    TestBed.tick();

    expect(criteria()).toEqual({
      assignedToMe: false,
      reportedByMe: true,
      resolution: 'all',
      projects: ['ABC'],
      limit: 50,
    });

    criteria.update((value: JiraApiTaskIntakeCriteria) => ({
      ...value,
      projects: ['ABC', 'XYZ'],
      limit: 150,
    }));
    TestBed.tick();

    expect(storageService.create).toHaveBeenLastCalledWith(
      'jira-task-import-criteria:v1',
      expect.objectContaining({ projects: ['ABC', 'XYZ'], limit: 150 }),
      'settings',
    );
  });

  it('falls back for corrupt criteria and unsupported limits', () => {
    const criteria = signal<JiraApiTaskIntakeCriteria>({ ...DEFAULT_CRITERIA });
    storageService.read.mockReturnValueOnce(of({ assignedToMe: 'yes' }));
    service.restoreCriteria(criteria);

    expect(criteria()).toEqual(DEFAULT_CRITERIA);

    storageService.read.mockReturnValueOnce(of({
      assignedToMe: true,
      reportedByMe: false,
      resolution: 'resolved',
      projects: [],
      limit: 125,
    }));
    service.restoreCriteria(criteria);

    expect(criteria().limit).toBe(50);
  });

  it('loads prepared candidates with default Tags and normalized criteria', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [
        {
          key: 'ABC-1',
          summary: 'Bug',
          status: 'Open',
          issueType: 'Bug',
          updated: '2026-07-25T12:30:00+03:00',
        },
        {
          key: 'ABC-2',
          summary: 'Task',
          status: 'Open',
          issueType: 'Task',
          updated: 'invalid',
        },
      ],
      meta: { limit: 50, truncated: true },
    }));

    const result = await firstValueFrom(service.findCandidates({
      assignedToMe: true,
      reportedByMe: false,
      resolution: 'resolved',
      projects: ['ABC', 'XYZ'],
      limit: 125,
    }));

    expect(apiRequestService.request).toHaveBeenCalledWith(
      'https://api/task/jira/missing?assignedToMe=true&reportedByMe=false&resolution=resolved&limit=50&projects=ABC%2CXYZ',
      'get',
      null,
    );
    expect(result.meta).toEqual({ limit: 50, truncated: true });
    expect(result.rows[0]).toMatchObject({
      key: 'ABC-1',
      updated: new Date('2026-07-25T12:30:00+03:00'),
      tags: [opex],
      intakeStatus: '',
    });
    expect(result.rows[1]).toMatchObject({
      key: 'ABC-2',
      updated: null,
      tags: [capex],
      intakeStatus: '',
    });
  });

  it('creates sequentially, continues after failure, refreshes once, and returns a partial outcome', async () => {
    const candidates = [
      buildCandidate('ABC-1', [opex]),
      buildCandidate('ABC-2', [capex]),
    ];
    apiRequestService.request
      .mockReturnValueOnce(throwError(() => new Error('first failed')))
      .mockReturnValueOnce(of({}));

    const outcome = await firstValueFrom(service.createTasks(candidates));

    expect(apiRequestService.request.mock.calls.map((call: unknown[]) => call[1])).toEqual(['post', 'post']);
    expect(apiRequestService.request.mock.calls[1][2]).toEqual(expect.objectContaining({
      name: 'ABC-2',
      description: '',
      tags: ['capex-id'],
    }));
    expect(tasksService.list).toHaveBeenCalledOnce();
    expect(outcome).toEqual({
      status: 'partial',
      createdCount: 1,
      failedCandidates: [{
        ...candidates[0],
        intakeStatus: 'Import failed',
      }],
    });
  });

  it('classifies successful and failed outcomes without leaking request errors', async () => {
    const candidate = buildCandidate('ABC-1', []);
    apiRequestService.request.mockReturnValueOnce(of({}));

    await expect(firstValueFrom(service.createTasks([candidate]))).resolves.toEqual({
      status: 'successful',
      createdCount: 1,
      failedCandidates: [],
    });

    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('private request failure')));

    await expect(firstValueFrom(service.createTasks([candidate]))).resolves.toEqual({
      status: 'failed',
      createdCount: 0,
      failedCandidates: [{
        ...candidate,
        intakeStatus: 'Import failed',
      }],
    });
  });
});

const buildCandidate = (
  key: string,
  candidateTags: Tag[],
): JiraApiTaskIntakeRow => ({
  id: key,
  key,
  summary: key,
  status: 'Open',
  issueType: 'Task',
  updated: null,
  tags: candidateTags,
  intakeStatus: '',
});
