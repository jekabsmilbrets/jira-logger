import { TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { TimeLogsService } from '@shared/services/time-logs.service';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { HeaderDataService } from './header-data.service';

describe('Layout Services header-data.service', () => {
  const apiRequestService = createResourceRequestHandleMock();
  let taskStartedSubject: Subject<Task>;
  let taskFinishedSubject: Subject<Task>;
  let timeLogChangedSubject: Subject<Task>;
  let activeTaskResponse: ApiTask | null;
  let secondsResponse: number;

  const apiTask = (
    id: string,
    name: string,
  ): ApiTask => ({
    id,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    name,
    timeLogs: [],
    tags: [],
  });

  const configureService: () => Promise<HeaderDataService> = async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: ApiRequestService, useValue: apiRequestService },
        {
          provide: TimeLogsService,
          useValue: {
            taskStarted$: taskStartedSubject.asObservable(),
            taskFinished$: taskFinishedSubject.asObservable(),
            timeLogChanged$: timeLogChangedSubject.asObservable(),
          },
        },
      ],
    });

    const service = TestBed.inject(HeaderDataService);
    service.activeTask();
    service.timeLoggedToday();
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();
    await Promise.resolve();

    return service;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    taskStartedSubject = new Subject<Task>();
    taskFinishedSubject = new Subject<Task>();
    timeLogChangedSubject = new Subject<Task>();
    activeTaskResponse = apiTask('1', 'TP-1');
    secondsResponse = 30;
    apiRequestService.request.mockReset().mockImplementation((url: string) => {
      if (url === 'https://api/task/active') {
        return activeTaskResponse ?
          of({ data: activeTaskResponse }) :
          throwError(() => ({ status: 404 }));
      }

      if (url === 'https://api/task/today/seconds') {
        return of({ data: { totalSeconds: secondsResponse } });
      }

      return of({ data: null });
    });
    apiRequestService.resource.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('loads active task and today seconds from backend endpoints', async () => {
    const service = await configureService();

    expect(service.activeTask()?.name).toBe('TP-1');
    expect(service.timeLoggedToday()).toBe(30);
    expect(apiRequestService.request).toHaveBeenCalledWith('https://api/task/active', 'get', null);
    expect(apiRequestService.request).toHaveBeenCalledWith('https://api/task/today/seconds', 'get', null);
  });

  it('returns null when the active task endpoint returns not found', async () => {
    activeTaskResponse = null;

    const service = await configureService();

    expect(service.activeTask()).toBeNull();
  });

  it('reloads the active task resource from code', async () => {
    const service = await configureService();
    activeTaskResponse = apiTask('2', 'TP-2');

    expect(service.reloadActiveTask()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();

    expect(service.activeTask()?.id).toBe('2');
  });

  it('reloads today seconds from code and every 10 seconds', async () => {
    const service = await configureService();
    secondsResponse = 40;

    expect(service.reloadTimeLoggedToday()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();

    expect(service.timeLoggedToday()).toBe(40);

    secondsResponse = 50;
    await vi.advanceTimersByTimeAsync(10_000);
    await TestBed.tick();

    expect(service.timeLoggedToday()).toBe(50);
  });

  it('reloads active task when task time logs change', async () => {
    const service = await configureService();

    activeTaskResponse = apiTask('2', 'TP-2');
    taskStartedSubject.next(new Task({ id: 'task-started', name: 'Started' } as any));
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();
    expect(service.activeTask()?.id).toBe('2');

    activeTaskResponse = apiTask('3', 'TP-3');
    taskFinishedSubject.next(new Task({ id: 'task-finished', name: 'Finished' } as any));
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();
    expect(service.activeTask()?.id).toBe('3');

    activeTaskResponse = apiTask('4', 'TP-4');
    timeLogChangedSubject.next(new Task({ id: 'task-updated', name: 'Updated' } as any));
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();
    expect(service.activeTask()?.id).toBe('4');
  });
});
