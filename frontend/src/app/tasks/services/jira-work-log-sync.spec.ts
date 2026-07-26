import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ApiRequest } from '@shared/services/api-request';
import { TimeLogs } from '@shared/services/time-logs';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { ReportDateCalendar } from '@report/services/report-date-calendar';

import { JiraWorkLogSync } from './jira-work-log-sync';
import { WorkLog } from './work-log';

describe('Tasks Service JiraWorkLogSync', () => {
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
    const apiRequestService = createResourceRequestHandleMock();
    apiRequestService.request.mockReturnValue(of(undefined));
    const reportDateCalendarService = {
      formatRequestDate: vi.fn((date: Date) => date.toISOString().slice(0, 10)),
    };
    const timeLogsService = {
      start: vi.fn(() => of(undefined)),
      stop: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        JiraWorkLogSync,
        WorkLog,
        { provide: ApiRequest, useValue: apiRequestService },
        { provide: ReportDateCalendar, useValue: reportDateCalendarService },
        { provide: TimeLogs, useValue: timeLogsService },
      ],
    });

    return {
      apiRequestService,
      reportDateCalendarService,
      service: TestBed.inject(JiraWorkLogSync),
      timeLogsService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('syncs a report date without stopping a non-running task', async () => {
    const { apiRequestService, reportDateCalendarService, service, timeLogsService } = setup();
    const task = buildTask();
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(reportDateCalendarService.formatRequestDate).toHaveBeenCalledWith(date);
    expect(apiRequestService.request).toHaveBeenCalledWith(
      'https://api/task/task-1/2026-05-30',
      'post',
      null,
    );
    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(result).toEqual({
      reloadReport: true,
      message: 'Task "Task" synced successfully!',
      duration: 5000,
    });
  });

  it('returns success when syncing interrupts and continues a running task', async () => {
    const { apiRequestService, service, timeLogsService } = setup();
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(apiRequestService.request).toHaveBeenCalledWith(
      'https://api/task/task-1/2026-05-30',
      'post',
      null,
    );
    expect(timeLogsService.start).toHaveBeenCalledWith(task);
    expect(result).toEqual({
      reloadReport: true,
      message: 'Task "Task" synced successfully!',
      duration: 5000,
    });
  });

  it('returns failure when stopping a running task fails', async () => {
    const { apiRequestService, service, timeLogsService } = setup();
    const error = new Error('stop failed');
    timeLogsService.stop.mockReturnValueOnce(throwError(() => error));
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(apiRequestService.request).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(result).toEqual({
      reloadReport: false,
      message: 'Task "Task" failed synced! ',
      duration: 5000,
    });
  });

  it('returns failure when sync fails after stopping a running task', async () => {
    const { apiRequestService, service, timeLogsService } = setup();
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({
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
    const { apiRequestService, service, timeLogsService } = setup();
    const error = new Error('restart failed');
    timeLogsService.start.mockReturnValueOnce(throwError(() => error));
    const task = buildTask(buildRunningTimeLog());
    const date = new Date('2026-05-30T00:00:00.000Z');

    const result = await firstValueFrom(service.syncReportDate(task, date));

    expect(apiRequestService.request).toHaveBeenCalledWith(
      'https://api/task/task-1/2026-05-30',
      'post',
      null,
    );
    expect(result).toEqual({
      reloadReport: true,
      message: 'Synced to Jira, but Work Log could not be continued.',
      duration: null,
    });
  });
});
