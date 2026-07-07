import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { WorkLogService } from './work-log.service';

describe('WorkLogService', () => {
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
        WorkLogService,
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogsService, useValue: timeLogsService },
      ],
    });

    return {
      service: TestBed.inject(WorkLogService),
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

});
