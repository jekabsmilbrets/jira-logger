import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeLv from '@angular/common/locales/lv';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { TaskQueryService } from '@shared/services/task-query.service';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { TasksService } from './tasks.service';

describe('Shared Services tasks.service', () => {
  let service: TasksService;
  const apiRequestService = createResourceRequestHandleMock();
  const errorDialogService = {
    openDialog: vi.fn(() => of(undefined)),
  } as any;
  const taskQueryService = {
    query: vi.fn(),
  };

  beforeEach(async () => {
    registerLocaleData(localeLv, 'lv-LV');
    apiRequestService.request.mockReset();
    apiRequestService.resource.mockClear();
    apiRequestService.isLoadingSignal.set(false);
    errorDialogService.openDialog.mockReset();
    errorDialogService.openDialog.mockReturnValue(of(undefined));
    taskQueryService.query.mockReset().mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly(), addLoader: vi.fn() } },
        { provide: ApiRequestService, useValue: apiRequestService },
        { provide: ErrorDialogService, useValue: errorDialogService },
        { provide: TaskQueryService, useValue: taskQueryService },
      ],
    });
    service = TestBed.inject(TasksService);
    vi.clearAllMocks();
  });

  it('lists tasks and maps response', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [{
        id: '1',
        name: 'Task A',
        timeLogs: [],
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      }],
    }));
    const result = await firstValueFrom(service.list());

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Task);
    expect(service.recentTasks()).toEqual(result);
  });

  it('routes non-404 list failures through the error dialog', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 500 })));

    await expect(firstValueFrom(service.list())).rejects.toMatchObject({ status: 500 });
    expect(errorDialogService.openDialog).toHaveBeenCalledTimes(1);
  });

  it('exposes recent tasks by latest time log descending', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [
        {
          id: 'older',
          name: 'Older',
          timeLogs: [],
          lastTimeLog: { startTime: '2026-03-01T10:00:00.000Z' },
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'newer',
          name: 'Newer',
          timeLogs: [],
          lastTimeLog: { startTime: '2026-03-02T10:00:00.000Z' },
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    }));

    await firstValueFrom(service.list());

    expect(service.recentTasks().map((task: Task) => task.name)).toEqual(['Newer', 'Older']);
  });

  it('sorts tasks without a time log after dated recent tasks', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [
        { id: 'none', name: 'No log', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'dated', name: 'Dated', timeLogs: [], lastTimeLog: { startTime: '2026-03-02T10:00:00.000Z' }, tags: [], createdAt: '2024-01-01T00:00:00.000Z' },
      ],
    }));

    await firstValueFrom(service.list());
    expect(service.recentTasks().map((task: Task) => task.name)).toEqual(['Dated', 'No log']);
  });

  it('loads visible tasks into task state without replacing all tasks for filtered queries', async () => {
    const allTask = new Task({ id: 'all', name: 'All', timeLogs: [], tags: [] } as any);
    const visibleTask = new Task({ id: 'visible', name: 'Visible', timeLogs: [], tags: [] } as any);

    taskQueryService.query.mockReturnValueOnce(of([allTask]));
    await firstValueFrom(service.loadVisibleTasks({}));

    taskQueryService.query.mockReturnValueOnce(of([visibleTask]));
    await firstValueFrom(service.loadVisibleTasks({ name: 'Visible' } as any));

    expect(service.tasks()).toEqual([visibleTask]);
    expect(service.allTasks()).toEqual([allTask]);
  });

  it('taskExist returns a mapped value', async () => {
    apiRequestService.request.mockReturnValueOnce(of(undefined));

    await expect(firstValueFrom(service.taskExist('abc'))).resolves.toBeNull();
  });

  it('taskExist does not open error dialog for duplicate-name conflicts', async () => {
    apiRequestService.request.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );

    await expect(firstValueFrom(service.taskExist('duplicate-name'))).rejects.toMatchObject({ status: 409 });
    expect(errorDialogService.openDialog).not.toHaveBeenCalled();
  });

  it('taskExist also suppresses dialog for plain 409 error objects', async () => {
    apiRequestService.request.mockReturnValueOnce(
      throwError(() => ({ status: 409 })),
    );

    await expect(firstValueFrom(service.taskExist('duplicate-name'))).rejects.toMatchObject({ status: 409 });
    expect(errorDialogService.openDialog).not.toHaveBeenCalled();
  });

  it('create/update/delete trigger expected request flow', async () => {
    apiRequestService.request
      .mockReturnValueOnce(of({}))
      .mockReturnValueOnce(of({ data: [{ id: '1', name: 'T', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' }] }))
      .mockReturnValueOnce(of({}))
      .mockReturnValueOnce(of({ data: [{ id: '1', name: 'T', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' }] }))
      .mockReturnValueOnce(of(undefined))
      .mockReturnValueOnce(of({ data: [] }));

    const task = new Task({ id: '1', name: 'T', tags: [], timeLogs: [] } as any);

    await firstValueFrom(service.create(task));
    await firstValueFrom(service.update(task));
    await firstValueFrom(service.delete(task));

    expect(apiRequestService.request).toHaveBeenCalled();
  });

  it('passes task tag ids through save request bodies', async () => {
    const task = new Task({ id: '1', name: 'Tagged', tags: [new Tag({ id: 'tag-1', name: 'Tag' })], timeLogs: [] } as any);
    (service as any).tasksSignal.set([task]);
    apiRequestService.request.mockReturnValueOnce(of({}));

    await firstValueFrom(service.create(task, true));

    expect(apiRequestService.request.mock.calls[0][2]).toEqual(expect.objectContaining({ tags: ['tag-1'] }));
  });

  it('trims task descriptions when building save request bodies', async () => {
    apiRequestService.request.mockReturnValueOnce(of({}));
    const task = new Task({ id: '1', name: '  T  ', description: '  description  ', tags: [], timeLogs: [] } as any);
    (service as any).tasksSignal.set([task]);

    await firstValueFrom(service.create(task, true));

    expect(apiRequestService.request).toHaveBeenCalledWith(
      expect.any(String),
      'post',
      expect.objectContaining({ name: 'T', description: 'description' }),
    );
  });

  it('list handles 404 by returning []', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 404 })));
    await expect(firstValueFrom(service.list())).resolves.toEqual([]);
  });

  it('create reports error through ErrorDialogService when request fails', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('create-fail')));
    const task = new Task({ id: '1', name: 'T', tags: [], timeLogs: [] } as any);

    await expect(firstValueFrom(service.create(task))).rejects.toThrow('create-fail');
    expect(errorDialogService.openDialog).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached error-dialog service promise', async () => {
    const first = (service as any)['loadErrorDialogService']();
    const second = (service as any)['loadErrorDialogService']();

    const [firstService, secondService] = await Promise.all([first, second]);
    expect(firstService).toBe(secondService);
    expect(firstService).toBe(errorDialogService);
  });

  it('registers its loader and loads unfiltered tasks into both collections', async () => {
    service.init();
    const task = new Task({ id: '1', name: 'Task', timeLogs: [], tags: [] } as any);
    taskQueryService.query.mockReturnValueOnce(of([task]));

    await expect(firstValueFrom(service.loadVisibleTasks({}))).resolves.toEqual([task]);
    expect(service.allTasks()).toEqual([task]);
    expect(service.loaderStateService.addLoader).toHaveBeenCalledWith(service.isLoading, 'TasksService');
  });

  it('supports skip-reload mutations and finds tasks by name', async () => {
    const task = new Task({ id: undefined, name: '', description: '', tags: [], timeLogs: [] } as any);
    const responseTask = new Task({ id: undefined, name: '', tags: [], timeLogs: [] } as any);
    (service as any).tasksSignal.set([responseTask]);
    apiRequestService.request.mockReturnValueOnce(of({}));

    await expect(firstValueFrom(service.create(task, true))).resolves.toBe(responseTask);
  });

  it('reports missing created tasks instead of returning an undefined value', async () => {
    const task = new Task({ id: 'missing', name: 'Missing', tags: [], timeLogs: [] } as any);
    apiRequestService.request.mockReturnValueOnce(of({}));
    (service as any).tasksSignal.set([]);

    await expect(firstValueFrom(service.create(task, true)))
      .rejects.toThrow('Problems creating task "Missing"!');
  });

  it('routes non-conflict existence errors through the error dialog', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 500 })));

    await expect(firstValueFrom(service.taskExist('error'))).rejects.toMatchObject({ status: 500 });
    expect(errorDialogService.openDialog).toHaveBeenCalled();
  });

  it('routes malformed status errors through the error dialog', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: '500' })));

    await expect(firstValueFrom(service.taskExist('error'))).rejects.toMatchObject({ status: '500' });
    expect(errorDialogService.openDialog).toHaveBeenCalled();
  });

  it('routes delete request errors through the error dialog', async () => {
    const task = new Task({ id: '1', name: 'Task', tags: [], timeLogs: [] } as any);
    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('delete failed')));

    await expect(firstValueFrom(service.delete(task))).rejects.toThrow('delete failed');
    expect(errorDialogService.openDialog).toHaveBeenCalled();
  });
});
