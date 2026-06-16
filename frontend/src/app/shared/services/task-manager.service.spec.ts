import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import { TaskManagerService } from './task-manager.service';

describe('Shared Services task-manager.service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('derives active task from tasks state and computes logged time', async () => {
    const tasks = signal<Task[]>([]);

    const runningTask = new Task({ id: '1', name: 'A' } as any);

    const tasksServiceMock = {
      tasks: tasks.asReadonly(),
      filteredList: vi.fn(() => new BehaviorSubject<Task[]>([runningTask])),
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);

    runningTask.lastTimeLog = { startTime: new Date('2026-01-01T10:00:00.000Z') } as any;
    tasks.set([runningTask]);
    expect(service.activeTask()?.id).toBe('1');

    tasks.set([]);
    expect(service.activeTask()).toBeNull();

    vi.advanceTimersByTime(10010);
    expect(tasksServiceMock.filteredList).toHaveBeenCalled();
  });

  it('returns null when no running task exists', async () => {
    const tasks = signal<Task[]>([]);
    const runningTask = new Task({ id: '1', name: 'A' } as any);

    const tasksServiceMock = {
      tasks: tasks.asReadonly(),
      filteredList: vi.fn(() => new BehaviorSubject<Task[]>([runningTask])),
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);
    expect(service.activeTask()).toBeNull();
  });

  it('updates active task when the running task in tasks state changes', async () => {
    const runningLog = new Date('2026-01-01T10:00:00.000Z');
    const runningTask = new Task({ id: '1', name: 'A', timeLogs: [{ startTime: runningLog }] } as any);
    runningTask.lastTimeLog = runningTask.timeLogs[0];
    const nextRunningLog = new Date('2026-01-01T11:00:00.000Z');
    const nextRunningTask = new Task({ id: '2', name: 'B', timeLogs: [{ startTime: nextRunningLog }] } as any);
    nextRunningTask.lastTimeLog = nextRunningTask.timeLogs[0];
    const tasks = signal<Task[]>([runningTask]);

    const tasksServiceMock = {
      tasks: tasks.asReadonly(),
      filteredList: vi.fn(() => new BehaviorSubject<Task[]>([runningTask])),
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);
    expect(service.activeTask()?.id).toBe('1');

    tasks.set([nextRunningTask]);
    expect(service.activeTask()?.id).toBe('2');
  });
});
