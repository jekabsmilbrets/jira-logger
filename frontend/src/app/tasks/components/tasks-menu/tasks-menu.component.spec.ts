import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Tag } from '@shared/models/tag.model';

import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { CreateTaskFromGroupInterface } from '@tasks/interfaces/create-task-from-group.interface';
import { TaskCreateService } from '@tasks/services/task-create.service';
import { TaskImportService } from '@tasks/services/task-import.service';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TasksMenuComponent } from './tasks-menu.component';

describe('Tasks Components tasks-menu.component', () => {
  const createTaskFormFactory = (): FormGroup<CreateTaskFromGroupInterface> => new FormGroup({
    name: new FormControl<string | null>(null),
    description: new FormControl<string | null>(null),
    tags: new FormControl<Tag[] | null>([]),
  });

  const tasksServiceMock = {
    isLoading$: of(false),
    tasks$: of<Task[]>([]),
    filteredList: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  };

  const tasksSettingsServiceMock = {
    openDialog: vi.fn(),
  };

  const taskImportServiceMock = {
    importData: vi.fn(),
  };

  const taskCreateServiceMock = {
    createFormGroup: vi.fn(),
  };

  const tagsServiceMock = {
    tags$: of([]),
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    tasksServiceMock.filteredList.mockReset();
    tasksServiceMock.create.mockReset();
    tasksServiceMock.list.mockReset();
    tasksSettingsServiceMock.openDialog.mockReset();
    taskImportServiceMock.importData.mockReset();
    taskCreateServiceMock.createFormGroup.mockReset();

    tasksServiceMock.filteredList.mockReturnValue(of([]));
    tasksServiceMock.create.mockImplementation((task: Task) => of(task));
    tasksServiceMock.list.mockReturnValue(of([]));
    tasksSettingsServiceMock.openDialog.mockReturnValue(of(undefined));
    taskImportServiceMock.importData.mockReturnValue(of(true));
    taskCreateServiceMock.createFormGroup.mockImplementation(createTaskFormFactory);

    await TestBed.configureTestingModule({
      imports: [TasksMenuComponent, ReactiveFormsModule],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TasksSettingsService, useValue: tasksSettingsServiceMock },
        { provide: TaskImportService, useValue: taskImportServiceMock },
        { provide: TaskCreateService, useValue: taskCreateServiceMock },
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
    const component = fixture.componentInstance as unknown as { createTaskForm: FormGroup };

    component.createTaskForm.get('name')?.setValue('Build docs');
    vi.advanceTimersByTime(301);

    expect(tasksServiceMock.filteredList).toHaveBeenCalledWith({ name: 'Build docs' }, true);
  });

  it('handles filteredList errors through catchError branch', () => {
    tasksServiceMock.filteredList.mockReturnValueOnce(of([]));
    tasksServiceMock.filteredList.mockReturnValueOnce(throwError(() => new Error('failed filter')));

    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as { createTaskForm: FormGroup };

    component.createTaskForm.get('name')?.setValue('first');
    vi.advanceTimersByTime(301);
    component.createTaskForm.get('name')?.setValue('second');
    vi.advanceTimersByTime(301);

    expect(tasksServiceMock.filteredList).toHaveBeenCalledTimes(2);
  });

  it('creates task and resets tags to empty array', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as {
      onCreate: () => void;
      createTaskForm: FormGroup;
    };

    component.createTaskForm.setValue({
      name: 'New Task',
      description: 'Desc',
      tags: [new Tag({ id: '1', name: 'Frontend' })],
    });

    component.onCreate();

    expect(tasksServiceMock.create).toHaveBeenCalledTimes(1);
    const createdTask = tasksServiceMock.create.mock.calls[0][0] as Task;
    expect(createdTask.name).toBe('New Task');
    expect(component.createTaskForm.get('name')?.value).toBeNull();
    expect(component.createTaskForm.get('tags')?.value).toEqual([]);
  });

  it('submits create form from DOM and triggers task creation', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as { createTaskForm: FormGroup };

    component.createTaskForm.setValue({
      name: 'From DOM',
      description: null,
      tags: [],
    });
    fixture.detectChanges();

    const submitForm = fixture.debugElement.query(By.css('form'));
    submitForm.triggerEventHandler('ngSubmit', {});

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
    tagsServiceMock.tags$ = of([
      new Tag({ id: '1', name: 'Frontend' }),
      new Tag({ id: '2', name: 'Backend' }),
    ]) as any;

    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TasksMenuComponent, ReactiveFormsModule],
      providers: [
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TasksSettingsService, useValue: tasksSettingsServiceMock },
        { provide: TaskImportService, useValue: taskImportServiceMock },
        { provide: TaskCreateService, useValue: taskCreateServiceMock },
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

    tasksServiceMock.tasks$ = of([task]);
    tasksSettingsServiceMock.openDialog.mockReturnValue(of(result));

    component.onOpenSettingsDialog();

    expect(taskImportServiceMock.importData).toHaveBeenCalledWith(result);
    expect(tasksServiceMock.list).toHaveBeenCalledTimes(1);
  });
});
