import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { TaskImportPersistence } from './task-import-persistence.service';

describe('TaskImportPersistence', () => {
  let service: TaskImportPersistence;
  const tagsService = {
    tags: signal<Tag[]>([]).asReadonly(),
    create: vi.fn(),
  };
  const tasksService = {
    tasks: signal<Task[]>([]).asReadonly(),
    create: vi.fn(),
  };
  const timeLogsService = {
    create: vi.fn(),
  };

  beforeEach(() => {
    tagsService.tags = signal<Tag[]>([
      new Tag({ id: 'tag-1', name: ' Frontend ' }),
    ]).asReadonly();
    tagsService.create.mockReset();
    tasksService.tasks = signal<Task[]>([
      new Task({ id: 'task-1', name: ' Existing Task ', timeLogs: [], tags: [] }),
    ]).asReadonly();
    tasksService.create.mockReset();
    timeLogsService.create.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TaskImportPersistence,
        { provide: TagsService, useValue: tagsService },
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogsService, useValue: timeLogsService },
      ],
    });

    service = TestBed.inject(TaskImportPersistence);
  });

  it('reads existing names through normalized sets', () => {
    expect(service.existingTagNames()).toEqual(new Set(['frontend']));
    expect(service.existingTaskNames()).toEqual(new Set(['existing task']));
    expect(service.findTag('frontend')?.id).toBe('tag-1');
  });

  it('delegates create operations to resource modules', () => {
    const task = new Task({ id: 'task-1', timeLogs: [], tags: [] } as any);
    const timeLog = new TimeLog({ startTime: new Date() });
    tagsService.create.mockReturnValue(of(new Tag({ name: 'Backend' })));
    tasksService.create.mockReturnValue(of(task));
    timeLogsService.create.mockReturnValue(of(timeLog));

    service.createTag('Backend').subscribe();
    service.createTask(task).subscribe();
    service.createTimeLog(task, timeLog).subscribe();

    expect(tagsService.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Backend' }));
    expect(tasksService.create).toHaveBeenCalledWith(task);
    expect(timeLogsService.create).toHaveBeenCalledWith(task, timeLog);
  });
});
