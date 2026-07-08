import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import { TaskBackupUnsupportedMetadataService } from '@tasks/services/task-backup-unsupported-metadata.service';

import { TaskBackupService } from './task-backup.service';

describe('Tasks Services task-backup.service', () => {
  let service: TaskBackupService;

  const tagsServiceMock = {
    tags: signal<Tag[]>([]).asReadonly(),
    create: vi.fn(),
  };
  const tasksServiceMock = {
    allTasks: signal<Task[]>([]).asReadonly(),
    create: vi.fn(),
    list: vi.fn(),
  };
  const timeLogsServiceMock = {
    create: vi.fn(),
  };

  const loaderStateServiceMock = {
    addLoader: vi.fn(),
  };

  beforeEach(() => {
    tagsServiceMock.tags = signal<Tag[]>([]).asReadonly();
    tagsServiceMock.create.mockReset();
    tasksServiceMock.allTasks = signal<Task[]>([]).asReadonly();
    tasksServiceMock.create.mockReset();
    tasksServiceMock.list.mockReset();
    tasksServiceMock.list.mockReturnValue(of([]));
    timeLogsServiceMock.create.mockReset();
    loaderStateServiceMock.addLoader.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TaskBackupService,
        TaskBackupUnsupportedMetadataService,
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

  it('exports current tasks as Task Backup JSON', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_717_300_800_000);

    const task: Task = new Task({
      name: 'Task A',
      description: 'Export me',
      tags: [],
      timeLogs: [],
    });

    expect(JSON.parse(service.exportTasksForUser([task]))).toEqual({
      version: 2,
      exportedAt: 1_717_300_800_000,
      tasks: [{
        name: 'Task A',
        description: 'Export me',
        timeLogs: [],
        tags: [],
        metadata: {
          timeLogs: [],
          tags: [],
          timeLogged: 0,
        },
      }],
    });
    expect(service.exportTasksForUser([new Task({ name: 'Exported task', timeLogs: [], tags: [] })]))
      .toContain('\n  "version": 2');
  });

  it('parses Task Import Request JSON using current tags', () => {
    tagsServiceMock.tags = signal([
      new Tag({ id: 'tag-1', name: 'Frontend' }),
    ]).asReadonly();

    const request = service.parseTaskImportRequest(JSON.stringify([
      {
        _name: 'Imported task',
        _description: 'Imported',
        _timeLogs: [],
        _tags: [{ _id: 'tag-1' }],
      },
    ]));

    expect(request.tasks[0].tags).toEqual([{
      name: 'Frontend',
      existingTagId: 'tag-1',
    }]);
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
    service.applyTaskBackup(request).subscribe((value) => {
      result = value;
    });

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.list).toHaveBeenCalledTimes(1);
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
    service.applyTaskBackup(request).subscribe((value) => {
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
        tags: [{ name: 'Frontend' }],
      }],
      warnings: [],
    };

    tagsServiceMock.create.mockReturnValue(of(createdTag));
    tasksServiceMock.create.mockReturnValue(of(createdTask));

    let result: any;
    service.applyTaskBackup(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    const createdTaskInput = tasksServiceMock.create.mock.calls[0]?.[0] as Task;
    expect(createdTaskInput.tags).toEqual([createdTag]);
    expect(result.createdTagCount).toBe(1);
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

    let result: any;
    service.applyTaskBackup(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).not.toHaveBeenCalled();
    const createdTaskInput = tasksServiceMock.create.mock.calls[0]?.[0] as Task;
    expect(createdTaskInput.tags).toEqual([new Tag({ id: 'tag-1', name: 'Frontend' })]);
    expect(result.createdTagCount).toBe(0);
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

    let result: any;
    service.applyTaskBackup(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.create).toHaveBeenCalledTimes(2);
    expect((tasksServiceMock.create.mock.calls[0]?.[0] as Task).tags).toEqual([createdTag]);
    expect((tasksServiceMock.create.mock.calls[1]?.[0] as Task).tags).toEqual([createdTag]);
    expect(result.createdTagCount).toBe(1);
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

    let result: any;
    service.applyTaskBackup(request).subscribe((value) => {
      result = value;
    });

    expect(tagsServiceMock.create).not.toHaveBeenCalled();
    expect((tasksServiceMock.create.mock.calls[0]?.[0] as Task).tags).toEqual([new Tag({ id: 'tag-1', name: 'Frontend' })]);
    expect((tasksServiceMock.create.mock.calls[1]?.[0] as Task).tags).toEqual([new Tag({ id: 'tag-1', name: 'Frontend' })]);
    expect(result.createdTagCount).toBe(0);
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

    service.applyTaskBackup(request).subscribe();

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
    service.applyTaskBackup(request).subscribe({
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

    let result: any;
    service.applyTaskBackup(request).subscribe((value) => {
      result = value;
    });

    expect(result.status).toBe('blocked');
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
    service.applyTaskBackup(request).subscribe({
      error: (e) => {
        emittedError = e;
      },
    });

    expect(emittedError).toBe(error);
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
  });

  it('registers loader on init', () => {
    service.init();

    expect(loaderStateServiceMock.addLoader).toHaveBeenCalledTimes(1);
    expect(loaderStateServiceMock.addLoader).toHaveBeenCalledWith(
      service.isLoading,
      'TaskBackupService',
    );
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
});
