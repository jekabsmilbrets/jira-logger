import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TaskQueryService } from '@shared/services/task-query.service';
import { TasksService } from '@shared/services/tasks.service';

import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

import { TaskManagerService } from './task-manager.service';

describe('Shared Services task-manager.service', () => {
  const reportDateCalendarServiceMock = {
    todayReportDate: vi.fn(() => new Date('2026-01-01T00:00:00.000Z')),
    timeLoggedForReportDate: vi.fn(() => 0),
  };
  const taskQueryServiceMock = {
    query: vi.fn(() => new BehaviorSubject<Task[]>([])),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    taskQueryServiceMock.query.mockReset().mockReturnValue(new BehaviorSubject<Task[]>([]));
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('derives active task from tasks state and computes logged time', async () => {
    const tasks = signal<Task[]>([]);

    const runningTask = new Task({ id: '1', name: 'A' } as any);

    const tasksServiceMock = {
      allTasks: tasks.asReadonly(),
    } as any;
    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>([runningTask]));

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskQueryService, useValue: taskQueryServiceMock },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);

    runningTask.lastTimeLog = { startTime: new Date('2026-01-01T10:00:00.000Z') } as any;
    tasks.set([runningTask]);
    expect(service.activeTask()?.id).toBe('1');

    tasks.set([]);
    expect(service.activeTask()).toBeNull();

    vi.advanceTimersByTime(10010);
    expect(taskQueryServiceMock.query).toHaveBeenCalled();
  });

  it('returns null when no running task exists', async () => {
    const tasks = signal<Task[]>([]);
    const runningTask = new Task({ id: '1', name: 'A' } as any);

    const tasksServiceMock = {
      allTasks: tasks.asReadonly(),
    } as any;
    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>([runningTask]));

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskQueryService, useValue: taskQueryServiceMock },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarServiceMock },
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
      allTasks: tasks.asReadonly(),
    } as any;
    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>([runningTask]));

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskQueryService, useValue: taskQueryServiceMock },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);
    expect(service.activeTask()?.id).toBe('1');

    tasks.set([nextRunningTask]);
    expect(service.activeTask()?.id).toBe('2');
  });

  it('keeps active task from the unfiltered task state when visible tasks are filtered', async () => {
    const runningLog = new Date('2026-01-01T10:00:00.000Z');
    const runningTask = new Task({ id: '124', name: 'TP-124', timeLogs: [{ startTime: runningLog }] } as any);
    runningTask.lastTimeLog = runningTask.timeLogs[0];
    const visibleTasks = signal<Task[]>([new Task({ id: '8', name: 'TP-8', timeLogs: [] } as any)]);
    const allTasks = signal<Task[]>([runningTask, ...visibleTasks()]);

    const tasksServiceMock = {
      allTasks: allTasks.asReadonly(),
    } as any;
    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>(visibleTasks()));

    await TestBed.configureTestingModule({
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskQueryService, useValue: taskQueryServiceMock },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarServiceMock },
      ],
    });

    const service = TestBed.inject(TaskManagerService);

    expect(service.activeTask()?.name).toBe('TP-124');
  });
});
