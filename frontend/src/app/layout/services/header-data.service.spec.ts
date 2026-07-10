import { TestBed } from '@angular/core/testing';

import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TaskQueryService } from '@shared/services/task-query.service';

import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

import { HeaderDataService } from './header-data.service';

describe('Layout Services header-data.service', () => {
  const reportDateCalendarServiceMock = {
    todayReportDate: vi.fn(() => new Date('2026-01-01T00:00:00.000Z')),
    timeLoggedForReportDate: vi.fn(() => 0),
  };
  const taskQueryServiceMock = {
    query: vi.fn(() => new BehaviorSubject<Task[]>([])),
  };
  const configureService: () => Promise<HeaderDataService> = async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: TaskQueryService, useValue: taskQueryServiceMock },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarServiceMock },
      ],
    });

    const service = TestBed.inject(HeaderDataService);
    service.activeTask();
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();
    await Promise.resolve();

    return service;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    taskQueryServiceMock.query.mockReset().mockReturnValue(new BehaviorSubject<Task[]>([]));
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('derives active task and logged time from one today query', async () => {
    const runningTask = new Task({ id: '1', name: 'A' } as any);
    const stoppedTask = new Task({ id: '2', name: 'B' } as any);

    runningTask.lastTimeLog = { startTime: new Date('2026-01-01T10:00:00.000Z') } as any;
    reportDateCalendarServiceMock.timeLoggedForReportDate
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(20);
    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>([runningTask, stoppedTask]));

    const service = await configureService();

    expect(service.activeTask()?.id).toBe('1');
    expect(service.timeLoggedToday()).toBe(30);
    expect(taskQueryServiceMock.query).toHaveBeenCalledWith({
      date: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('returns null when no running task exists', async () => {
    const runningTask = new Task({ id: '1', name: 'A' } as any);

    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>([runningTask]));

    const service = await configureService();

    expect(service.activeTask()).toBeNull();
  });

  it('reloads the header snapshot on the interval', async () => {
    const runningLog = new Date('2026-01-01T10:00:00.000Z');
    const runningTask = new Task({ id: '1', name: 'A', timeLogs: [{ startTime: runningLog }] } as any);
    runningTask.lastTimeLog = runningTask.timeLogs[0];
    const nextRunningLog = new Date('2026-01-01T11:00:00.000Z');
    const nextRunningTask = new Task({ id: '2', name: 'B', timeLogs: [{ startTime: nextRunningLog }] } as any);
    nextRunningTask.lastTimeLog = nextRunningTask.timeLogs[0];

    taskQueryServiceMock.query
      .mockReturnValueOnce(new BehaviorSubject<Task[]>([runningTask]))
      .mockReturnValueOnce(new BehaviorSubject<Task[]>([nextRunningTask]));

    const service = await configureService();
    expect(service.activeTask()?.id).toBe('1');

    vi.advanceTimersByTime(10010);
    await vi.advanceTimersByTimeAsync(0);
    await TestBed.tick();

    expect(service.activeTask()?.id).toBe('2');
    expect(taskQueryServiceMock.query).toHaveBeenCalledTimes(2);
  });

  it('uses the today query as the active task source', async () => {
    const runningLog = new Date('2026-01-01T10:00:00.000Z');
    const runningTask = new Task({ id: '124', name: 'TP-124', timeLogs: [{ startTime: runningLog }] } as any);
    runningTask.lastTimeLog = runningTask.timeLogs[0];

    taskQueryServiceMock.query.mockReturnValue(new BehaviorSubject<Task[]>([runningTask]));

    const service = await configureService();

    expect(service.activeTask()?.name).toBe('TP-124');
  });
});
