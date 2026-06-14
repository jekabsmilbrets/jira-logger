import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { TaskImportService } from './task-import.service';

describe('Tasks Services task-import.service', () => {
  let service: TaskImportService;

  const tasksServiceMock = {
    create: vi.fn(),
  };

  const timeLogsServiceMock = {
    create: vi.fn(),
  };

  const loaderStateServiceMock = {
    addLoader: vi.fn(),
  };

  beforeEach(() => {
    tasksServiceMock.create.mockReset();
    timeLogsServiceMock.create.mockReset();
    loaderStateServiceMock.addLoader.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TaskImportService,
        {
          provide: TasksService,
          useValue: tasksServiceMock,
        },
        {
          provide: TimeLogsService,
          useValue: timeLogsServiceMock,
        },
        {
          provide: LoaderStateService,
          useValue: loaderStateServiceMock,
        },
      ],
    });

    service = TestBed.inject(TaskImportService);
  });

  it('imports all tasks and returns true', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const apiData = [{
      id: '1',
      createdAt: '2026-01-01T00:00:00.000Z',
      name: 'Task 1',
      description: 'Imported',
      timeLogs: [],
      tags: [],
    }];

    tasksServiceMock.create.mockReturnValue(of(createdTask));

    let result: boolean | undefined;
    service.importData(apiData).subscribe((value) => {
      result = value;
    });

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    expect(timeLogsServiceMock.create).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('imports nested time logs for created task', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const apiData = [{
      id: '1',
      createdAt: '2026-01-01T00:00:00.000Z',
      name: 'Task 1',
      description: 'Imported',
      timeLogs: [{ startTime: '2026-01-01T10:00:00.000Z', endTime: '2026-01-01T10:05:00.000Z' }],
      tags: [],
    }];

    tasksServiceMock.create.mockReturnValue(of(createdTask));
    timeLogsServiceMock.create.mockReturnValue(of(undefined));

    let result: boolean | undefined;
    service.importData(apiData as any).subscribe((value) => {
      result = value;
    });

    expect(timeLogsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('stops loading and rethrows when task creation fails', () => {
    const apiData = [{
      id: '1',
      createdAt: '2026-01-01T00:00:00.000Z',
      name: 'Task 1',
      timeLogs: [],
      tags: [],
    }];
    const error = new Error('import failed');

    tasksServiceMock.create.mockReturnValue(throwError(() => error));

    let emittedError: unknown;
    service.importData(apiData).subscribe({
      error: (e) => {
        emittedError = e;
      },
    });

    expect(emittedError).toBe(error);
  });

  it('registers loader on init', () => {
    service.init();

    expect(loaderStateServiceMock.addLoader).toHaveBeenCalledTimes(1);
    expect(loaderStateServiceMock.addLoader).toHaveBeenCalledWith(
      service.isLoading,
      '_TaskImportService',
    );
  });
});
