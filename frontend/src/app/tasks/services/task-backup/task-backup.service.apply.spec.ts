import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { defer, of, Subject, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';

import { TaskBackupService } from './task-backup.service';

describe('TaskBackupService apply', () => {
  let service: TaskBackupService;

  const tagsServiceMock = {
    tags: signal<Tag[]>([]).asReadonly(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  const tasksServiceMock = {
    allTasks: signal<Task[]>([]).asReadonly(),
    create: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };
  const timeLogsServiceMock = {
    create: vi.fn(),
    delete: vi.fn(),
  };

  const loaderStateServiceMock = {
    addLoader: vi.fn(),
  };

  beforeEach(() => {
    tagsServiceMock.tags = signal<Tag[]>([]).asReadonly();
    tagsServiceMock.create.mockReset();
    tagsServiceMock.delete.mockReset();
    tasksServiceMock.allTasks = signal<Task[]>([]).asReadonly();
    tasksServiceMock.create.mockReset();
    tasksServiceMock.delete.mockReset();
    tasksServiceMock.list.mockReset();
    tasksServiceMock.list.mockReturnValue(of([]));
    timeLogsServiceMock.create.mockReset();
    timeLogsServiceMock.delete.mockReset();
    loaderStateServiceMock.addLoader.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TaskBackupService,
        { provide: TagsService, useValue: tagsServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TimeLogsService, useValue: timeLogsServiceMock },
        {
          provide: LoaderStateService,
          useValue: loaderStateServiceMock,
        },
      ],
    });

    service = TestBed.inject(TaskBackupService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('imports all tasks and returns a success outcome', () => {
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
    service.applyTaskBackupForUser(request).subscribe((value) => {
      result = value;
    });

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.list).toHaveBeenCalledTimes(1);
    expect(timeLogsServiceMock.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Imported 1 task, 0 time logs.',
      duration: 7000,
    });
  });

  it('handles an empty import without creating tasks', () => {
    const request: TaskImportRequest = { tasks: [], warnings: [] };
    let result: unknown;

    service.applyTaskBackupForUser(request).subscribe((value) => {
      result = value;
    });

    expect(result).toEqual({
      message: 'Imported 0 tasks, 0 time logs.',
      duration: 7000,
    });
    expect(tasksServiceMock.create).not.toHaveBeenCalled();
    expect(tasksServiceMock.list).toHaveBeenCalledTimes(1);
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

    let result: unknown;
    service.applyTaskBackupForUser(request).subscribe((value) => {
      result = value;
    });

    expect(timeLogsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      message: 'Imported 1 task, 1 time log.',
      duration: 7000,
    });
  });

  it('creates missing tags before importing tasks', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const createdTag = new Tag({ id: 'tag-1', name: 'Frontend' });
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: [{ name: 'Frontend' }],
      }],
      warnings: [],
    };

    tagsServiceMock.create.mockReturnValue(of(createdTag));
    tasksServiceMock.create.mockReturnValue(of(createdTask));

    let result: unknown;
    service.applyTaskBackupForUser(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    const createdTaskInput = tasksServiceMock.create.mock.calls[0]?.[0] as Task;
    expect(createdTaskInput.tags).toEqual([createdTag]);
    expect(result).toEqual({
      message: 'Imported 1 task, 0 time logs, created 1 tag.',
      duration: 7000,
    });
  });

  it('uses existing tag intent without creating tags', () => {
    const createdTask = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: [{ name: 'Frontend', existingTagId: 'tag-1' }],
      }],
      warnings: [],
    };

    tasksServiceMock.create.mockReturnValue(of(createdTask));

    service.applyTaskBackupForUser(request).subscribe();

    expect(tagsServiceMock.create).not.toHaveBeenCalled();
    const createdTaskInput = tasksServiceMock.create.mock.calls[0]?.[0] as Task;
    expect(createdTaskInput.tags).toEqual([new Tag({ id: 'tag-1', name: 'Frontend' })]);
  });

  it('creates each missing tag once and reuses it across imported tasks', () => {
    const createdTag = new Tag({ id: 'tag-1', name: 'Frontend' });
    const request: TaskImportRequest = {
      tasks: [
        {
          name: 'Task 1',
          description: undefined,
          timeLogs: [],
          tags: [{ name: 'Frontend' }],
        },
        {
          name: 'Task 2',
          description: undefined,
          timeLogs: [],
          tags: [{ name: ' frontend ' }],
        },
      ],
      warnings: [],
    };

    tagsServiceMock.create.mockReturnValue(of(createdTag));
    tasksServiceMock.create.mockImplementation((task: Task) => of(new Task({
      id: task.name,
      name: task.name,
      tags: task.tags,
      timeLogs: [],
    })));

    let result: unknown;
    service.applyTaskBackupForUser(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.create).toHaveBeenCalledTimes(2);
    expect((tasksServiceMock.create.mock.calls[0]?.[0] as Task).tags).toEqual([createdTag]);
    expect((tasksServiceMock.create.mock.calls[1]?.[0] as Task).tags).toEqual([createdTag]);
    expect(result).toEqual({
      message: 'Imported 2 tasks, 0 time logs, created 1 tag.',
      duration: 7000,
    });
  });

  it('does not create a tag when another imported task maps the same tag to an existing tag', () => {
    const request: TaskImportRequest = {
      tasks: [
        {
          name: 'Task 1',
          description: undefined,
          timeLogs: [],
          tags: [{ name: 'frontend' }],
        },
        {
          name: 'Task 2',
          description: undefined,
          timeLogs: [],
          tags: [{ name: 'Frontend', existingTagId: 'tag-1' }],
        },
      ],
      warnings: [],
    };

    tasksServiceMock.create.mockImplementation((task: Task) => of(new Task({
      id: task.name,
      name: task.name,
      tags: task.tags,
      timeLogs: [],
    })));

    service.applyTaskBackupForUser(request).subscribe();

    expect(tagsServiceMock.create).not.toHaveBeenCalled();
    expect((tasksServiceMock.create.mock.calls[0]?.[0] as Task).tags).toEqual([new Tag({ id: 'tag-1', name: 'Frontend' })]);
    expect((tasksServiceMock.create.mock.calls[1]?.[0] as Task).tags).toEqual([new Tag({ id: 'tag-1', name: 'Frontend' })]);
  });

  it('imports mixed existing and missing tag intent', () => {
    const createdTag = new Tag({ id: 'tag-2', name: 'Backend' });
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: [
          { name: 'Frontend', existingTagId: 'tag-1' },
          { name: 'Backend' },
        ],
      }],
      warnings: [],
    };

    tagsServiceMock.create.mockReturnValue(of(createdTag));
    tasksServiceMock.create.mockReturnValue(of(new Task({ id: '1', name: 'Task 1', tags: [], timeLogs: [] })));

    service.applyTaskBackupForUser(request).subscribe();

    const createdTaskInput = tasksServiceMock.create.mock.calls[0]?.[0] as Task;
    expect(createdTaskInput.tags).toEqual([
      new Tag({ id: 'tag-1', name: 'Frontend' }),
      createdTag,
    ]);
  });

  it('throws when a created tag response does not resolve requested tag intent', () => {
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Task 1',
        description: undefined,
        timeLogs: [],
        tags: [{ name: 'Frontend' }],
      }],
      warnings: [],
    };

    tagsServiceMock.create.mockReturnValue(of(new Tag({ id: 'tag-1', name: 'Other' })));

    let emittedError: unknown;
    service.applyTaskBackupForUser(request).subscribe({
      error: (e) => {
        emittedError = e;
      },
    });

    expect(emittedError).toEqual(new Error('Missing tag "Frontend" after tag creation.'));
    expect(tasksServiceMock.create).not.toHaveBeenCalled();
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

    tasksServiceMock.allTasks = signal<Task[]>([
      new Task({ id: 'existing', name: ' Task 1 ', tags: [], timeLogs: [] }),
    ]).asReadonly();

    let result: unknown;
    service.applyTaskBackupForUser(request).subscribe((value) => {
      result = value;
    });

    expect(result).toEqual({
      message: 'Task 1',
      duration: 9000,
    });
    expect(tasksServiceMock.create).not.toHaveBeenCalled();
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
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
    service.applyTaskBackupForUser(request).subscribe({
      error: (e) => {
        emittedError = e;
      },
    });

    expect(emittedError).toBe(error);
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
  });

  it('stops sequential creation at the first Task Import Failure without rollback', () => {
    const attemptedTaskNames: string[] = [];
    const creationOrder: string[] = [];
    const error = new Error('second task failed');
    const request: TaskImportRequest = {
      tasks: [
        {
          name: 'Task 1',
          description: undefined,
          tags: [{ name: 'Frontend' }],
          timeLogs: [{ startTime: 1, endTime: 2, description: undefined }],
        },
        {
          name: 'Task 2',
          description: undefined,
          tags: [],
          timeLogs: [],
        },
        {
          name: 'Task 3',
          description: undefined,
          tags: [],
          timeLogs: [],
        },
      ],
      warnings: [],
    };

    tagsServiceMock.create.mockReturnValue(defer(() => {
      creationOrder.push('Tag');
      return of(new Tag({ id: 'tag-1', name: 'Frontend' }));
    }));
    tasksServiceMock.create.mockImplementation((task: Task) => defer(() => {
      attemptedTaskNames.push(task.name);
      creationOrder.push(task.name);

      return task.name === 'Task 2' ?
        throwError(() => error) :
        of(new Task({ id: task.name, name: task.name, tags: task.tags, timeLogs: [] }));
    }));
    timeLogsServiceMock.create.mockReturnValue(defer(() => {
      creationOrder.push('Time Log');
      return of(new TimeLog({}));
    }));

    let emittedError: unknown;
    service.applyTaskBackupForUser(request).subscribe({
      error: (caught) => {
        emittedError = caught;
      },
    });

    expect(emittedError).toBe(error);
    expect(attemptedTaskNames).toEqual(['Task 1', 'Task 2']);
    expect(creationOrder).toEqual(['Tag', 'Task 1', 'Time Log', 'Task 2']);
    expect(timeLogsServiceMock.create).toHaveBeenCalledOnce();
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
    expect(tagsServiceMock.delete).not.toHaveBeenCalled();
    expect(tasksServiceMock.delete).not.toHaveBeenCalled();
    expect(timeLogsServiceMock.delete).not.toHaveBeenCalled();
    expect(service.isLoading()).toBe(false);
  });

  it('registers loader on init', () => {
    service.init();

    expect(loaderStateServiceMock.addLoader).toHaveBeenCalledTimes(1);
    expect(loaderStateServiceMock.addLoader).toHaveBeenCalledWith(
      service.isLoading,
      'TaskBackupService',
    );
  });

  it('queues concurrent Task Backup requests behind the external apply operation', async () => {
    const firstTask = new Subject<Task>();
    const firstRequest: TaskImportRequest = {
      tasks: [{ name: 'Task 1', description: undefined, tags: [], timeLogs: [] }],
      warnings: [],
    };
    const secondRequest: TaskImportRequest = {
      tasks: [{ name: 'Task 2', description: undefined, tags: [], timeLogs: [] }],
      warnings: [],
    };

    tasksServiceMock.create
      .mockReturnValueOnce(firstTask)
      .mockReturnValueOnce(of(new Task({ id: '2', name: 'Task 2', tags: [], timeLogs: [] })));

    service.applyTaskBackupForUser(firstRequest).subscribe();
    service.applyTaskBackupForUser(secondRequest).subscribe();

    expect(tasksServiceMock.create).toHaveBeenCalledOnce();
    expect(service.isLoading()).toBe(true);

    firstTask.next(new Task({ id: '1', name: 'Task 1', tags: [], timeLogs: [] }));
    firstTask.complete();
    await Promise.resolve();

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(2);
    expect(tasksServiceMock.list).toHaveBeenCalledTimes(2);
    expect(service.isLoading()).toBe(false);
  });

  it('returns user-facing successful and blocked Task Import outcomes', () => {
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Imported',
        description: undefined,
        tags: [],
        timeLogs: [
          {
            startTime: Date.parse('2026-01-01T10:00:00.000Z'),
            endTime: Date.parse('2026-01-01T11:00:00.000Z'),
            description: undefined,
          },
          {
            startTime: Date.parse('2026-01-02T10:00:00.000Z'),
            endTime: Date.parse('2026-01-02T11:00:00.000Z'),
            description: undefined,
          },
          {
            startTime: Date.parse('2026-01-03T10:00:00.000Z'),
            endTime: Date.parse('2026-01-03T11:00:00.000Z'),
            description: undefined,
          },
        ],
      }],
      warnings: [{
        code: 'unsupported-metadata',
        taskName: 'Task 1',
        fields: ['legacy'],
        message: 'Legacy metadata ignored',
      }],
    };

    tagsServiceMock.create.mockReturnValue(of(new Tag({ id: 'tag-1', name: 'Created' })));
    tasksServiceMock.create.mockReturnValue(of(new Task({ id: 'task-1', name: 'Imported', tags: [], timeLogs: [] })));
    timeLogsServiceMock.create.mockReturnValue(of(new TimeLog({})));

    service.applyTaskBackupForUser(request).subscribe((outcome) => {
      expect(outcome).toEqual({
        message: 'Imported 1 task, 3 time logs, 1 warning.',
        duration: 7000,
      });
    });

    tasksServiceMock.allTasks = signal([
      new Task({ id: 'existing', name: 'Imported', tags: [], timeLogs: [] }),
    ]).asReadonly();

    service.applyTaskBackupForUser(request).subscribe((outcome) => {
      expect(outcome).toEqual({
        message: 'Imported',
        duration: 9000,
      });
    });
  });

  it('formats a successful outcome with a created tag and no warnings', () => {
    const request: TaskImportRequest = {
      tasks: [{
        name: 'Imported',
        description: undefined,
        tags: [{ name: 'Frontend' }],
        timeLogs: [{
          startTime: Date.parse('2026-01-01T10:00:00.000Z'),
          endTime: undefined,
          description: undefined,
        }],
      }],
      warnings: [],
    };

    const createdTag = new Tag({ id: 'tag-1', name: 'Frontend' });
    tagsServiceMock.create.mockReturnValue(of(createdTag));
    tasksServiceMock.create.mockReturnValue(of(new Task({ id: 'task-1', name: 'Imported', tags: [], timeLogs: [] })));
    timeLogsServiceMock.create.mockReturnValue(of(new TimeLog({})));

    service.applyTaskBackupForUser(request).subscribe((outcome) => {
      expect(outcome).toEqual({
        message: 'Imported 1 task, 1 time log, created 1 tag.',
        duration: 7000,
      });
    });

    const createdTimeLog = timeLogsServiceMock.create.mock.calls[0]?.[1] as TimeLog;
    expect(createdTimeLog.endTime).toBeUndefined();
  });
});
