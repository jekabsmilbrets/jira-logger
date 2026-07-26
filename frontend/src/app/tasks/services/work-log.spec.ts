import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { Tasks } from '@shared/services/tasks';
import { TimeLogs } from '@shared/services/time-logs';

import { WorkLog } from './work-log';

describe('Tasks Service WorkLog', () => {
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
      list: vi.fn(() => of([])),
    };
    const timeLogsService = {
      start: vi.fn(() => of(undefined)),
      stop: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        WorkLog,
        { provide: Tasks, useValue: tasksService },
        { provide: TimeLogs, useValue: timeLogsService },
      ],
    });

    return {
      service: TestBed.inject(WorkLog),
      tasksService,
      timeLogsService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('starts a work log and reloads tasks', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const task = buildTask();

    await firstValueFrom(service.toggleTaskWorkLog(task));

    expect(timeLogsService.start).toHaveBeenCalledWith(task);
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('stops a running work log and reloads tasks', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const task = buildTask(buildRunningTimeLog());

    await firstValueFrom(service.toggleTaskWorkLog(task));

    expect(timeLogsService.stop).toHaveBeenCalledWith(task);
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('reloads tasks without stopping when task is not running', async () => {
    const { service, tasksService, timeLogsService } = setup();
    const task = buildTask(new TimeLog({
      startTime: new Date('2026-03-02T10:00:00.000Z'),
      endTime: new Date('2026-03-02T11:00:00.000Z'),
    }));

    await firstValueFrom(service.toggleTaskWorkLog(task));

    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('runs work without interruption for a stopped task', async () => {
    const { service, timeLogsService } = setup();
    const task = buildTask();

    const result = await firstValueFrom(service.runWithWorkLogInterruption(task, of('done')));

    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(result).toEqual({ result: 'done', continued: true });
  });

  it('stops and continues a running work log around work', async () => {
    const { service, timeLogsService } = setup();
    const task = buildTask(buildRunningTimeLog());

    const result = await firstValueFrom(service.runWithWorkLogInterruption(task, of('done')));

    expect(timeLogsService.stop).toHaveBeenCalledWith(task);
    expect(timeLogsService.start).toHaveBeenCalledWith(task);
    expect(result).toEqual({ result: 'done', continued: true });
  });

  it('reports when a running work log cannot be continued', async () => {
    const { service, timeLogsService } = setup();
    timeLogsService.start.mockReturnValueOnce(throwError(() => new Error('start failed')));
    const task = buildTask(buildRunningTimeLog());

    const result = await firstValueFrom(service.runWithWorkLogInterruption(task, of('done')));

    expect(result).toEqual({ result: 'done', continued: false });
  });

});
