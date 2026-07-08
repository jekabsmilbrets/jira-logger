import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { JiraWorkLogSyncService } from './jira-work-log-sync.service';
import { WorkLogService } from './work-log.service';

describe('JiraWorkLogSyncService', () => {
  const buildTask = (timeLog?: TimeLog): Task => {
    const task = new Task({
      id: 'task-1',
      name: 'Task',
      timeLogs: timeLog ? [timeLog] : [],
      tags: [],
    });
    task.lastTimeLog = timeLog;

    return task;
  };

  const buildRunningTimeLog = (): TimeLog => new TimeLog({
    startTime: new Date('2026-03-02T10:00:00.000Z'),
  });

  const setup = () => {
    const tasksService = {
      syncDateToJiraApi: vi.fn(() => of(true)),
    };
    const timeLogsService = {
      start: vi.fn(() => of(undefined)),
      stop: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        JiraWorkLogSyncService,
        WorkLogService,
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogsService, useValue: timeLogsService },
      ],
    });

    return {
      service: TestBed.inject(JiraWorkLogSyncService),
      tasksService,
      timeLogsService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('syncs a report date without stopping a non-running task', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const task = buildTask();
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(tasksService.syncDateToJiraApi).toHaveBeenCalledWith(task, date);
    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(result).toEqual({
      reloadReport: true,
      message: 'Task "Task" synced successfully!',
      duration: 5000,
    });
  });

  it('returns success when syncing interrupts and continues a running task', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(tasksService.syncDateToJiraApi).toHaveBeenCalledWith(task, date);
    expect(timeLogsService.start).toHaveBeenCalledWith(task);
    expect(result).toEqual({
      reloadReport: true,
      message: 'Task "Task" synced successfully!',
      duration: 5000,
    });
  });

  it('returns failure when stopping a running task fails', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const error = new Error('stop failed');
    timeLogsService.stop.mockReturnValueOnce(throwError(() => error));
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(tasksService.syncDateToJiraApi).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(result).toEqual({
      reloadReport: false,
      message: 'Task "Task" failed synced! ',
      duration: 5000,
    });
  });

  it('returns failure when sync fails after stopping a running task', async () => {
    const { service, tasksService, timeLogsService } = setup();
    tasksService.syncDateToJiraApi.mockReturnValueOnce(throwError(() => ({
      error: { errors: ['Bad transition'] },
    })));
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(timeLogsService.start).toHaveBeenCalledWith(task);
    expect(result).toEqual({
      reloadReport: false,
      message: 'Task "Task" failed synced! Bad transition',
      duration: 5000,
    });
  });

  it('returns partial sync when restarting a running task fails after sync', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const error = new Error('restart failed');
    timeLogsService.start.mockReturnValueOnce(throwError(() => error));
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(tasksService.syncDateToJiraApi).toHaveBeenCalledWith(task, date);
    expect(result).toEqual({
      reloadReport: true,
      message: 'Synced to Jira, but Work Log could not be continued.',
      duration: null,
    });
  });
});
