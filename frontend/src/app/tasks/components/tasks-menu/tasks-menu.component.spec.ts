import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ResponsiveMenuService } from '@shared/services/responsive-menu.service';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';
import type { ImportReport, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import { TaskBackupService } from '@tasks/services/task-backup.service';

import { TasksMenuComponent } from './tasks-menu.component';

describe('Tasks Components tasks-menu.component', () => {
  const tasksServiceMock = {
    isLoading: signal(false).asReadonly(),
    allTasks: signal<Task[]>([]).asReadonly(),
    create: vi.fn(),
    list: vi.fn(),
    loadVisibleTasks: vi.fn(),
    taskExist: vi.fn(),
  };

  const taskBackupServiceMock = {
    applyTaskBackupForUser: vi.fn(),
  };

  const tagsServiceMock = {
    tags: signal<Tag[]>([]).asReadonly(),
  };

  const matSnackBarMock = {
    open: vi.fn(),
  };
  const matDialogMock = {
    open: vi.fn(),
  };
  let isSmallerThanDesktop: WritableSignal<boolean>;

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

  beforeEach(async () => {
    vi.useFakeTimers();

    tasksServiceMock.create.mockReset();
    tasksServiceMock.list.mockReset();
    tasksServiceMock.loadVisibleTasks.mockReset();
    tasksServiceMock.taskExist.mockReset();
    tasksServiceMock.allTasks = signal<Task[]>([]).asReadonly();
    taskBackupServiceMock.applyTaskBackupForUser.mockReset();
    matSnackBarMock.open.mockReset();
    matDialogMock.open.mockReset();
    tagsServiceMock.tags = signal<Tag[]>([]).asReadonly();
    isSmallerThanDesktop = signal(false);

    tasksServiceMock.create.mockImplementation((task: Task) => of(task));
    tasksServiceMock.list.mockReturnValue(of([]));
    tasksServiceMock.loadVisibleTasks.mockReturnValue(of([]));
    tasksServiceMock.taskExist.mockReturnValue(of(null));
    taskBackupServiceMock.applyTaskBackupForUser.mockReturnValue(of({
      message: importReport.status,
      duration: 7000,
    }));
    matDialogMock.open.mockReturnValue({
      afterClosed: () => of(undefined),
    });

    await TestBed.configureTestingModule({
      imports: [TasksMenuComponent],
      providers: [
        {
          provide: ResponsiveMenuService,
          useValue: {
            isSmallerThanDesktop: isSmallerThanDesktop.asReadonly(),
          },
        },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskBackupService, useValue: taskBackupServiceMock },
        { provide: TagsService, useValue: tagsServiceMock },
        { provide: MatSnackBar, useValue: matSnackBarMock },
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

    expect(tasksServiceMock.loadVisibleTasks).toHaveBeenLastCalledWith({ name: 'Build docs' });
  });

  it('clears the name filter when the field becomes empty', async () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskForm.name().value.set('Build docs');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(301);

    component.createTaskForm.name().value.set('   ');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(301);

    expect(tasksServiceMock.loadVisibleTasks).toHaveBeenLastCalledWith({});
  });

  it('handles task query errors through catchError branch', () => {
    tasksServiceMock.loadVisibleTasks.mockReturnValueOnce(of([]));
    tasksServiceMock.loadVisibleTasks.mockReturnValueOnce(throwError(() => new Error('failed filter')));

    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;

    component.createTaskForm.name().value.set('first');
    fixture.detectChanges();
    vi.advanceTimersByTime(301);
    component.createTaskForm.name().value.set('second');
    fixture.detectChanges();
    vi.advanceTimersByTime(301);

    expect(tasksServiceMock.loadVisibleTasks).toHaveBeenCalledTimes(2);
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

  it('opens settings dialog when settings toggle button is clicked', async () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;
    const openSpy = vi.spyOn(component, 'onOpenSettingsDialog');
    fixture.detectChanges();

    const settingsButton = fixture.debugElement.query(By.css('tasks-settings-toggle button[aria-label="Open Tasks Settings"]'));
    settingsButton.nativeElement.click();
    await openSpy.mock.results[0]?.value;

    expect(matDialogMock.open).toHaveBeenCalledWith(TasksSettingsDialogComponent, {
      data: {
        tasks: [],
      },
    });
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
        {
          provide: ResponsiveMenuService,
          useValue: {
            isSmallerThanDesktop: isSmallerThanDesktop.asReadonly(),
          },
        },
        { provide: MatDialog, useValue: matDialogMock },
        { provide: TasksService, useValue: tasksServiceMock },
        { provide: TaskBackupService, useValue: taskBackupServiceMock },
        { provide: TagsService, useValue: tagsServiceMock },
        { provide: MatSnackBar, useValue: matSnackBarMock },
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

  it('renders inline menu items on desktop and a collapsed button on small screens', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);

    isSmallerThanDesktop.set(false);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('form'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('tasks-settings-toggle'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Open tasks menu"]'))).toBeFalsy();

    isSmallerThanDesktop.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('form'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('tasks-settings-toggle'))).toBeTruthy();
    const collapsedButton = fixture.debugElement.query(By.css('button[aria-label="Open tasks menu"]'));
    const tooltip = collapsedButton.injector.get(MatTooltip);

    expect(collapsedButton).toBeTruthy();
    expect(tooltip.message).toBe('Open tasks menu');
  });

  it('opens collapsed tasks menu dialog from the small-screen button', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);

    isSmallerThanDesktop.set(true);
    fixture.detectChanges();

    const menuButton = fixture.debugElement.query(By.css('button[aria-label="Open tasks menu"]'));
    menuButton.nativeElement.click();

    expect(matDialogMock.open).toHaveBeenCalledTimes(1);
    const [dialogTemplateRef] = matDialogMock.open.mock.calls[0] as [any];
    const view = dialogTemplateRef.createEmbeddedView({});
    view.detectChanges();
    expect(view.rootNodes[0].textContent).toContain('Create');
  });

  it('does not import when settings dialog returns undefined', async () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as {
      onOpenSettingsDialog: () => void;
    };

    matDialogMock.open.mockReturnValue({
      afterClosed: () => of(undefined),
    });

    component.onOpenSettingsDialog();

    expect(taskBackupServiceMock.applyTaskBackupForUser).not.toHaveBeenCalled();
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
  });

  it('imports tasks when settings dialog returns data', async () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as {
      onOpenSettingsDialog: () => void;
    };

    const task = new Task({ id: '1', name: 'Existing', tags: [], timeLogs: [] });
    tasksServiceMock.allTasks = signal([task]).asReadonly();
    matDialogMock.open.mockReturnValue({
      afterClosed: () => of(importRequest),
    });

    component.onOpenSettingsDialog();

    expect(taskBackupServiceMock.applyTaskBackupForUser).toHaveBeenCalledWith(importRequest);
    expect(tasksServiceMock.list).not.toHaveBeenCalled();
  });

  it('shows blocked import report without refreshing list', async () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as unknown as {
      onOpenSettingsDialog: () => void;
    };

    taskBackupServiceMock.applyTaskBackupForUser.mockReturnValue(of({
      message: 'Duplicate task names detected.',
      duration: 9000,
    }));
    matDialogMock.open.mockReturnValue({
      afterClosed: () => of(importRequest),
    });

    component.onOpenSettingsDialog();

    expect(tasksServiceMock.list).not.toHaveBeenCalled();
  });

  it('updates create-form tags and compares tags by id', () => {
    const fixture = TestBed.createComponent(TasksMenuComponent);
    const component = fixture.componentInstance as any;
    const selected = [new Tag({ id: 'tag-1', name: 'Frontend' })];

    component.onTagsChange(selected);

    expect(component.createTaskFormModel().tags).toEqual(selected);
    expect(component.isSameTag(new Tag({ id: 'tag-1' }), new Tag({ id: 'tag-1' }))).toBe(true);
    expect(component.isSameTag(new Tag({ id: 'tag-1' }), new Tag({ id: 'tag-2' }))).toBe(false);
  });
});
