import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';

import { TaskImportService } from './task-import.service';

describe('Tasks Services task-import.service', () => {
  let service: TaskImportService;

  const tasksServiceMock = {
    create: vi.fn(),
    tasks: signal<Task[]>([]).asReadonly(),
  };

  const timeLogsServiceMock = {
    create: vi.fn(),
  };

  const tagsServiceMock = {
    create: vi.fn(),
    tags: signal<Tag[]>([]).asReadonly(),
  };

  const loaderStateServiceMock = {
    addLoader: vi.fn(),
  };

  beforeEach(() => {
    tasksServiceMock.create.mockReset();
    tasksServiceMock.tasks = signal<Task[]>([]).asReadonly();
    timeLogsServiceMock.create.mockReset();
    tagsServiceMock.create.mockReset();
    tagsServiceMock.tags = signal<Tag[]>([]).asReadonly();
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
          provide: TagsService,
          useValue: tagsServiceMock,
        },
        {
          provide: LoaderStateService,
          useValue: loaderStateServiceMock,
        },
      ],
    });

    service = TestBed.inject(TaskImportService);
  });

  it('imports all tasks and returns success report', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: 'Imported',
        timeLogs: [],
        tags: [],
      }],
      warnings: [],
    };

    tasksServiceMock.create.mockReturnValue(of(createdTask));

    let result: unknown;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    expect(timeLogsServiceMock.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'success',
      createdTaskCount: 1,
      createdTagCount: 0,
      createdTimeLogCount: 0,
      warnings: [],
      errors: [],
    });
  });

  it('imports nested time logs for created task', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: 'Imported',
        timeLogs: [{ startTime: Date.parse('2026-01-01T10:00:00.000Z'), endTime: Date.parse('2026-01-01T10:05:00.000Z') }],
        tags: [],
      }],
      warnings: [],
    };

    tasksServiceMock.create.mockReturnValue(of(createdTask));
    timeLogsServiceMock.create.mockReturnValue(of(undefined));

    let result: any;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(timeLogsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(result.createdTimeLogCount).toBe(1);
  });

  it('creates missing tags before importing tasks', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const createdTag = new Tag({ id: 'tag-1', name: 'Frontend' });
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: ['Frontend'],
      }],
      warnings: [],
    };

    tagsServiceMock.tags = signal<Tag[]>([]).asReadonly();
    tagsServiceMock.create.mockImplementation((tag: Tag) => {
      tagsServiceMock.tags = signal<Tag[]>([createdTag]).asReadonly();
      return of(tag);
    });
    tasksServiceMock.create.mockReturnValue(of(createdTask));

    let result: any;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    expect(result.createdTagCount).toBe(1);
  });

  it('returns blocked report when task names already exist locally', () => {
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: [],
      }],
      warnings: [],
    };

    tasksServiceMock.tasks = signal<Task[]>([
      new Task({ id: 'existing', name: 'Task 1', timeLogs: [], tags: [] }),
    ]).asReadonly();

    let result: any;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(result.status).toBe('blocked');
    expect(tasksServiceMock.create).not.toHaveBeenCalled();
  });

  it('stops loading and rethrows when task creation fails', () => {
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: [],
      }],
      warnings: [],
    };
    const error = new Error('import failed');

    tasksServiceMock.create.mockReturnValue(throwError(() => error));

    let emittedError: unknown;
    service.importData(request).subscribe({
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
