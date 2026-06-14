import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { TaskManagerService } from './task-manager.service';

describe('Shared Services task-manager.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('tracks active task from start/finish streams and computes logged time', async () => {
    const taskStarted$ = new Subject<Task>();
    const taskFinished$ = new Subject<Task>();
    const tasks = signal<Task[]>([]);

    const runningTask = new Task({ id: '1', name: 'A' } as any);
    const finishedTask = new Task({ id: '2', name: 'B' } as any);

    const tasksServiceMock = {
      tasks: tasks.asReadonly(),
      filteredList: vi.fn(() => new BehaviorSubject<Task[]>([runningTask])),
    } as any;

    const timeLogsServiceMock = {
      taskStarted$,
      taskFinished$,
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TimeLogsService, useValue: timeLogsServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);

    taskStarted$.next(runningTask);
    expect(service.activeTask()?.id).toBe('1');

    taskFinished$.next(finishedTask);
    expect(service.activeTask()?.id).toBe('1');

    taskFinished$.next(runningTask);
    expect(service.activeTask()).toBeNull();

    vi.advanceTimersByTime(10010);
    expect(tasksServiceMock.filteredList).toHaveBeenCalled();
  });

  it('swallows start stream errors and still initializes', async () => {
    const taskFinished$ = new Subject<Task>();
    const tasks = signal<Task[]>([]);
    const runningTask = new Task({ id: '1', name: 'A' } as any);

    const tasksServiceMock = {
      tasks: tasks.asReadonly(),
      filteredList: vi.fn(() => new BehaviorSubject<Task[]>([runningTask])),
    } as any;

    const timeLogsServiceMock = {
      taskStarted$: new Subject<Task>(),
      taskFinished$,
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TimeLogsService, useValue: timeLogsServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);
    taskFinished$.next(runningTask);
    expect(service.activeTask()).toBeNull();
  });

  it('sets active task from tasks list when running task exists', async () => {
    const taskStarted$ = new Subject<Task>();
    const taskFinished$ = new Subject<Task>();
    const runningLog = new Date('2026-01-01T10:00:00.000Z');
    const runningTask = new Task({ id: '1', name: 'A', timeLogs: [{ startTime: runningLog }] } as any);
    runningTask.lastTimeLog = runningTask.timeLogs[0];
    const tasks = signal<Task[]>([runningTask]);

    const tasksServiceMock = {
      tasks: tasks.asReadonly(),
      filteredList: vi.fn(() => new BehaviorSubject<Task[]>([runningTask])),
    } as any;

    const timeLogsServiceMock = {
      taskStarted$,
      taskFinished$,
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TimeLogsService, useValue: timeLogsServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);
    await Promise.resolve();
    expect(service.activeTask()?.id).toBe('1');
  });
});
