import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import type { ImportReport, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import { TaskBackupService } from '@tasks/services/task-backup.service';
import { TasksMenuService } from '@tasks/services/tasks-menu.service';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';

describe('TasksMenuService', () => {
  const tasksServiceMock = {
    allTasks: signal<Task[]>([]).asReadonly(),
    create: vi.fn(),
    loadVisibleTasks: vi.fn(),
    taskExist: vi.fn(),
  };
  const taskBackupServiceMock = {
    applyTaskBackupForUser: vi.fn(),
  };
  const tasksSettingsServiceMock = {
    openDialog: vi.fn(),
  };

  const importRequest: TaskImportRequest = {
    tasks: [{
      name: 'Imported',
      description: undefined,
      timeLogs: [],
      tags: [],
    }],
    warnings: [],
  };

  const importReport: ImportReport = {
    status: 'success',
    createdTaskCount: 1,
    createdTagCount: 0,
    createdTimeLogCount: 0,
    warnings: [],
    errors: [],
  };

  beforeEach(() => {
    tasksServiceMock.allTasks = signal<Task[]>([]).asReadonly();
    tasksServiceMock.create.mockReset().mockImplementation((task: Task) => of(task));
    tasksServiceMock.loadVisibleTasks.mockReset().mockReturnValue(of([]));
    tasksServiceMock.taskExist.mockReset().mockReturnValue(of(null));
    taskBackupServiceMock.applyTaskBackupForUser.mockReset().mockReturnValue(of({
      message: importReport.status,
      duration: 7000,
    }));
    tasksSettingsServiceMock.openDialog.mockReset().mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        TasksMenuService,
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskBackupService, useValue: taskBackupServiceMock },
        { provide: TasksSettingsService, useValue: tasksSettingsServiceMock },
      ],
    });
  });

  it('creates a task through the form interface and resets it', () => {
    const service = TestBed.inject(TasksMenuService);
    const model = signal({
      name: 'New Task',
      description: 'Desc',
      tags: [new Tag({ id: '1', name: 'Frontend' })],
    });
    const reset = vi.fn();
    const form = vi.fn(() => ({
      valid: () => true,
      markAsTouched: vi.fn(),
      reset,
    })) as any;

    service.createTask(form, model);

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    expect((tasksServiceMock.create.mock.calls[0][0] as Task).name).toBe('New Task');
    expect(reset).toHaveBeenCalledWith({ name: '', description: '', tags: [] });
  });

  it('marks invalid create forms as touched', () => {
    const service = TestBed.inject(TasksMenuService);
    const markAsTouched = vi.fn();
    const form = vi.fn(() => ({
      valid: () => false,
      markAsTouched,
      reset: vi.fn(),
    })) as any;

    service.createTask(form, signal({ name: '', description: '', tags: [] }));

    expect(markAsTouched).toHaveBeenCalledTimes(1);
    expect(tasksServiceMock.create).not.toHaveBeenCalled();
  });

  it('applies a Task Backup report from the settings dialog', () => {
    const service = TestBed.inject(TasksMenuService);
    const showReport = vi.fn();

    tasksSettingsServiceMock.openDialog.mockReturnValue(of(importRequest));

    service.importFromSettingsDialog(tasksSettingsServiceMock as unknown as TasksSettingsService, showReport);

    expect(taskBackupServiceMock.applyTaskBackupForUser).toHaveBeenCalledWith(importRequest);
    expect(showReport).toHaveBeenCalledWith('success', 7000);
  });
});
