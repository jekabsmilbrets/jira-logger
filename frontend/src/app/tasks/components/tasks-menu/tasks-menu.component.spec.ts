import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TaskImportService } from '@tasks/services/task-import.service';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';

import { TasksMenuComponent } from './tasks-menu.component';

describe('Tasks Components tasks-menu.component', () => {
  const tasksServiceMock = {
    isLoading: signal(false).asReadonly(),
    tasks: signal<Task[]>([]).asReadonly(),
    filteredList: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    taskExist: vi.fn(),
  };

  const tasksSettingsServiceMock = {
    openDialog: vi.fn(),
  };

  const taskImportServiceMock = {
    importData: vi.fn(),
  };

  const tagsServiceMock = {
    tags: signal<Tag[]>([]).asReadonly(),
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    tasksServiceMock.filteredList.mockReset();
    tasksServiceMock.create.mockReset();
    tasksServiceMock.list.mockReset();
    tasksServiceMock.taskExist.mockReset();
    tasksSettingsServiceMock.openDialog.mockReset();
    taskImportServiceMock.importData.mockReset();

    tasksServiceMock.filteredList.mockReturnValue(of([]));
    tasksServiceMock.create.mockImplementation((task: Task) => of(task));
    tasksServiceMock.list.mockReturnValue(of([]));
    tasksServiceMock.taskExist.mockReturnValue(of(null));
    tasksSettingsServiceMock.openDialog.mockReturnValue(of(undefined));
    taskImportServiceMock.importData.mockReturnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [TasksMenuComponent],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TasksSettingsService, useValue: tasksSettingsServiceMock },
        { provide: TaskImportService, useValue: taskImportServiceMock },
        { provide: TagsService, useValue: tagsServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('filters tasks by name when name field changes', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskForm.name().value.set('Build docs');
    fixture.detectChanges();
    vi.advanceTimersByTime(301);

    expect(tasksServiceMock.filteredList).toHaveBeenLastCalledWith({ name: 'Build docs' }, true);
  });

  it('handles filteredList errors through catchError branch', () => {
    tasksServiceMock.filteredList.mockReturnValueOnce(of([]));
    tasksServiceMock.filteredList.mockReturnValueOnce(throwError(() => new Error('failed filter')));

    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskForm.name().value.set('first');
    fixture.detectChanges();
    vi.advanceTimersByTime(301);
    component.createTaskForm.name().value.set('second');
    fixture.detectChanges();
    vi.advanceTimersByTime(301);

    expect(tasksServiceMock.filteredList).toHaveBeenCalledTimes(2);
  });

  it('does not submit create when duplicate-name validation fails', async () => {
    tasksServiceMock.taskExist.mockReturnValueOnce(throwError(() => ({ status: 409 })));

    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskForm.name().value.set('Existing Task');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(301);
    fixture.detectChanges();

    component.onCreate({ preventDefault: vi.fn() });

    expect(tasksServiceMock.create).not.toHaveBeenCalled();
  });

  it('creates task and resets tags to empty array', async () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskFormModel.set({
      name: 'New Task',
      description: 'Desc',
      tags: [new Tag({ id: '1', name: 'Frontend' })],
    });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(301);
    fixture.detectChanges();

    component.onCreate();

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    const createdTask = tasksServiceMock.create.mock.calls[0][0] as Task;
    expect(createdTask.name).toBe('New Task');
    expect(component.createTaskFormModel().name).toBe('');
    expect(component.createTaskFormModel().tags).toEqual([]);
  });

  it('submits create form from DOM and triggers task creation', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskFormModel.set({
      name: 'From DOM',
      description: '',
      tags: [],
    });
    fixture.detectChanges();
    vi.advanceTimersByTime(301);
    fixture.detectChanges();

    const submitForm = fixture.debugElement.query(By.css('form'));
    submitForm.triggerEventHandler('submit', { preventDefault: vi.fn() });

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    const createdTask = tasksServiceMock.create.mock.calls[0][0] as Task;
    expect(createdTask.name).toBe('From DOM');
  });

  it('opens settings dialog when settings toggle button is clicked', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    fixture.detectChanges();

    const settingsButton = fixture.debugElement.query(By.css('tasks-settings-toggle button[aria-label="Open Tasks Settings"]'));
    settingsButton.nativeElement.click();

    expect(tasksSettingsServiceMock.openDialog).toHaveBeenCalledTimes(1);
  });

  it('renders tag options from tags$ in template', async () => {
    tagsServiceMock.tags = signal([
      new Tag({ id: '1', name: 'Frontend' }),
      new Tag({ id: '2', name: 'Backend' }),
    ]).asReadonly();

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TasksMenuComponent],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TasksSettingsService, useValue: tasksSettingsServiceMock },
        { provide: TaskImportService, useValue: taskImportServiceMock },
        { provide: TagsService, useValue: tagsServiceMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TasksMenuComponent);
    fixture.detectChanges();

    const selectTrigger = fixture.debugElement.query(By.css('mat-select'));
    selectTrigger.nativeElement.click();
    fixture.detectChanges();

    const overlayText = document.body.textContent ?? '';
    expect(overlayText).toContain('Frontend');
    expect(overlayText).toContain('Backend');
  });

  it('does not import when settings dialog returns undefined', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as {
      onOpenSettingsDialog: () => void;
    };

    tasksSettingsServiceMock.openDialog.mockReturnValue(of(undefined));

    component.onOpenSettingsDialog();

    expect(taskImportServiceMock.importData).not.toHaveBeenCalled();
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
  });

  it('imports tasks and refreshes list when settings dialog returns data', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as {
      onOpenSettingsDialog: () => void;
    };

    const task = new Task({ id: '1', name: 'Existing', tags: [], timeLogs: [] });
    const result = [{ id: '10', createdAt: '2026-01-01T00:00:00.000Z', name: 'Imported', timeLogs: [], tags: [] }];

    tasksServiceMock.tasks = signal([task]).asReadonly();
    tasksSettingsServiceMock.openDialog.mockReturnValue(of(result));

    component.onOpenSettingsDialog();

    expect(taskImportServiceMock.importData).toHaveBeenCalledWith(result);
    expect(tasksServiceMock.list).toHaveBeenCalledTimes(1);
  });
});
