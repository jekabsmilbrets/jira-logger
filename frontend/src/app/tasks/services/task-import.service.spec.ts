import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import { TaskImportPersistence } from '@tasks/services/task-import-persistence.service';

import { TaskImportService } from './task-import.service';

describe('Tasks Services task-import.service', () => {
  let service: TaskImportService;

  const persistenceMock = {
    createTag: vi.fn(),
    createTask: vi.fn(),
    createTimeLog: vi.fn(),
    existingTagNames: vi.fn(() => new Set<string>()),
    existingTaskNames: vi.fn(() => new Set<string>()),
    findTag: vi.fn(),
    normalizeName: vi.fn((value: string) => value.trim().toLowerCase()),
  };

  const loaderStateServiceMock = {
    addLoader: vi.fn(),
  };

  beforeEach(() => {
    persistenceMock.createTag.mockReset();
    persistenceMock.createTask.mockReset();
    persistenceMock.createTimeLog.mockReset();
    persistenceMock.existingTagNames.mockReset();
    persistenceMock.existingTagNames.mockReturnValue(new Set<string>());
    persistenceMock.existingTaskNames.mockReset();
    persistenceMock.existingTaskNames.mockReturnValue(new Set<string>());
    persistenceMock.findTag.mockReset();
    persistenceMock.normalizeName.mockClear();
    loaderStateServiceMock.addLoader.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TaskImportService,
        {
          provide: TaskImportPersistence,
          useValue: persistenceMock,
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

    persistenceMock.createTask.mockReturnValue(of(createdTask));

    let result: unknown;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(persistenceMock.createTask).toHaveBeenCalledTimes(1);
    expect(persistenceMock.createTimeLog).not.toHaveBeenCalled();
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

    persistenceMock.createTask.mockReturnValue(of(createdTask));
    persistenceMock.createTimeLog.mockReturnValue(of(undefined));

    let result: any;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(persistenceMock.createTimeLog).toHaveBeenCalledTimes(1);
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

    persistenceMock.createTag.mockImplementation((tagName: string) => {
      persistenceMock.findTag.mockReturnValue(createdTag);
      return of(new Tag({ name: tagName }));
    });
    persistenceMock.createTask.mockReturnValue(of(createdTask));

    let result: any;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(persistenceMock.createTag).toHaveBeenCalledTimes(1);
    expect(persistenceMock.createTask).toHaveBeenCalledTimes(1);
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

    persistenceMock.existingTaskNames.mockReturnValue(new Set(['task 1']));

    let result: any;
    service.importData(request).subscribe((value) => {
      result = value;
    });

    expect(result.status).toBe('blocked');
    expect(persistenceMock.createTask).not.toHaveBeenCalled();
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

    persistenceMock.createTask.mockReturnValue(throwError(() => error));

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
