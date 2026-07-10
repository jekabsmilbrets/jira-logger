import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, take, throwError } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { TimeLogsService } from './time-logs.service';

describe('Shared Services time-logs.service', () => {
  let service: TimeLogsService;
  const apiRequestService = createResourceRequestHandleMock();

  beforeEach(async () => {
    apiRequestService.request.mockReset();
    apiRequestService.resource.mockClear();
    apiRequestService.isLoadingSignal.set(false);

    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly(), addLoader: vi.fn() } },
        { provide: ApiRequestService, useValue: apiRequestService },
      ],
    });

    service = TestBed.inject(TimeLogsService);
    vi.clearAllMocks();
  });

  it('sends create payload with unix-ms timestamp strings preserving time', async () => {
    const startTime = new Date('2024-01-01T10:20:30.456Z');
    const endTime = new Date('2024-01-01T11:22:33.789Z');
    const task = new Task({ id: 'task-1', name: 'Task', tags: [], timeLogs: [] } as any);
    const timeLog = new TimeLog({
      id: 'log-1',
      startTime,
      endTime,
      description: '  desc  ',
    } as any);

    apiRequestService.request.mockReturnValueOnce(of({ data: { id: 'log-1', task: 'task-1' } }));

    await firstValueFrom(service.create(task, timeLog));

    const body = apiRequestService.request.mock.calls[0]?.[2];
    expect(apiRequestService.request.mock.calls[0]?.[0]).toBe('https://api/task/task-1/time-log');
    expect(body.startTime).toBe(String(startTime.getTime()));
    expect(body.endTime).toBe(String(endTime.getTime()));
    expect(body.description).toBe('desc');
  });

  it('sends update payload with unix-ms timestamps and keeps undefined values', async () => {
    const task = new Task({ id: 'task-1', name: 'Task', tags: [], timeLogs: [] } as any);
    const timeLog = {
      id: 'log-1',
      startTime: undefined,
      endTime: undefined,
      description: undefined,
    } as unknown as TimeLog;

    apiRequestService.request.mockReturnValueOnce(of({ data: { id: 'log-1', task: 'task-1' } }));

    await firstValueFrom(service.update(task, timeLog));

    const body = apiRequestService.request.mock.calls[0]?.[2];
    expect(apiRequestService.request.mock.calls[0]?.[0]).toBe('https://api/task/task-1/time-log/log-1');
    expect(body.startTime).toBeUndefined();
    expect(body.endTime).toBeUndefined();
    expect(body.description).toBeUndefined();
  });

  it('emits changed task after time log updates', async () => {
    const task = new Task({ id: 'task-1', name: 'Task', tags: [], timeLogs: [] } as any);
    const timeLog = new TimeLog({
      id: 'log-1',
      startTime: new Date('2024-01-01T10:20:30.456Z'),
    } as any);
    const changedTask = firstValueFrom(service.timeLogChanged$.pipe(take(1)));

    apiRequestService.request.mockReturnValueOnce(of({ data: { id: 'log-1', task: 'task-1' } }));

    await firstValueFrom(service.update(task, timeLog));

    await expect(changedTask).resolves.toBe(task);
  });

  it('emits changed task after time log delete', async () => {
    const task = new Task({ id: 'task-1', name: 'Task', tags: [], timeLogs: [] } as any);
    const timeLog = new TimeLog({ id: 'log-1' } as any);
    const changedTask = firstValueFrom(service.timeLogChanged$.pipe(take(1)));

    apiRequestService.request.mockReturnValueOnce(of(undefined));

    await firstValueFrom(service.delete(task, timeLog));

    await expect(changedTask).resolves.toBe(task);
  });

  it('returns an empty list when the API reports no time logs for a task', async () => {
    const task = new Task({ id: 'task-1', name: 'Task', tags: [], timeLogs: [] } as any);

    apiRequestService.request.mockReturnValueOnce(throwError(() => ({
      status: 404,
      error: { errors: ['TimeLogs not found'] },
    })));

    await expect(firstValueFrom(service.list(task))).resolves.toEqual([]);
  });
});
