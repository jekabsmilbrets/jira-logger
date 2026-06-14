import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { TaskComponent } from './task.component';

describe('Tasks Components task.component', () => {
  const buildTask = (): Task => {
    const task = new Task({
      name: 'Task name',
      description: 'Task description',
      timeLogs: [],
      tags: [
        new Tag({ id: '1', name: 'Frontend' }),
        new Tag({ id: '2', name: 'Backend' }),
      ],
    });
    task.lastTimeLog = undefined;
    return task;
  };

  const buildTimeLog = (startIso: string): TimeLog => new TimeLog({
    startTime: new Date(startIso),
  });

  const setup = async () => {
    const baseTask = buildTask();

    const areYouSureService = {
      openDialog: vi.fn(() => of(true)),
    };

    const tagsService = {
      tags: signal([
        new Tag({ id: '1', name: 'Frontend' }),
        new Tag({ id: '2', name: 'Backend' }),
      ]).asReadonly(),
    };

    const tasksService = {
      tasks: signal([baseTask]).asReadonly(),
    };

    const timeLogEditService = {
      openTimeLogsListDialog: vi.fn(() => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [TaskComponent],
      providers: [
        { provide: AreYouSureService, useValue: areYouSureService },
        { provide: TagsService, useValue: tagsService },
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogEditService, useValue: timeLogEditService },
      ],
    });

    const fixture = TestBed.createComponent(TaskComponent);
    fixture.componentRef.setInput('task', baseTask);
    fixture.componentRef.setInput('isLoading', false);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    return {
      fixture,
      component,
      baseTask,
      areYouSureService,
      tagsService,
      tasksService,
      timeLogEditService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('initializes its signal-form model from the input task', async () => {
    const { component, baseTask } = await setup();

    expect(component['taskFormModel']().name).toBe(baseTask.name);
    expect(component['taskFormModel']().description).toBe(baseTask.description);
    expect(component['taskFormModel']().tags).toEqual(baseTask.tags);
  });

  it('returns true when tags have same id', async () => {
    const { component } = await setup();

    expect(component['isSameTag'](new Tag({ id: '1' }), new Tag({ id: '1' }))).toBe(true);
    expect(component['isSameTag'](new Tag({ id: '1' }), new Tag({ id: '2' }))).toBe(false);
  });

  it('toggles edit mode and resets form only when entering edit mode', async () => {
    const { component } = await setup();

    component['taskFormModel'].update((value: { name: string; description: string; tags: Tag[] }) => ({
      ...value,
      name: 'Modified name',
    }));
    component['taskForm']().markAsDirty();

    component['onToggleEditMode']();
    expect(component['editMode']()).toBe(true);
    expect(component['taskFormModel']().name).toBe('Task name');

    component['onToggleEditMode']();
    expect(component['editMode']()).toBe(false);
  });

  it('emits update payload and exits edit mode on update', async () => {
    const { component } = await setup();
    const updateSpy = vi.spyOn(component['update'], 'emit');

    component['onToggleEditMode']();
    component['taskFormModel'].set({
      name: 'Updated name',
      description: 'Updated description',
      tags: [],
    });
    component['taskForm']().markAsDirty();
    component['onUpdate']();

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(component['editMode']()).toBe(false);
  });

  it('emits remove only when confirmation is true', async () => {
    const { component, baseTask, areYouSureService } = await setup();
    const removeSpy = vi.spyOn(component['remove'], 'emit');

    component['onRemove']();
    expect(removeSpy).toHaveBeenCalledWith(baseTask);

    areYouSureService.openDialog.mockReturnValueOnce(of(false));
    component['onRemove']();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('emits correct toggle action based on running state', async () => {
    const { component, baseTask } = await setup();
    const actionSpy = vi.spyOn(component['action'], 'emit');

    component['onToggleTimeLogging']();

    const runningTimeLog = buildTimeLog('2026-03-02T10:00:00.000Z');
    baseTask.lastTimeLog = runningTimeLog;

    component['onToggleTimeLogging']();

    expect(actionSpy).toHaveBeenCalledTimes(2);
    expect(actionSpy.mock.calls[0][0][1]).toBe('start-work-log');
    expect(actionSpy.mock.calls[1][0][1]).toBe('stop-work-log');
  });

  it('emits timeLogsSaved when modal reports a successful save', async () => {
    const { component, timeLogEditService } = await setup();
    timeLogEditService.openTimeLogsListDialog.mockReturnValueOnce(of({
      saved: true,
    }) as any);

    const savedSpy = vi.spyOn(component['timeLogsSaved'], 'emit');

    component['onOpenTimeLogsModal']();

    expect(savedSpy).toHaveBeenCalledOnce();
  });

  it('ignores undefined and unsaved modal responses when opening time logs modal', async () => {
    const { component, timeLogEditService } = await setup();
    const savedSpy = vi.spyOn(component['timeLogsSaved'], 'emit');

    timeLogEditService.openTimeLogsListDialog.mockReturnValueOnce(of(undefined));
    component['onOpenTimeLogsModal']();

    timeLogEditService.openTimeLogsListDialog.mockReturnValueOnce(of({ saved: false }) as any);
    component['onOpenTimeLogsModal']();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('renders non-edit mode controls and switches to edit mode controls', async () => {
    const { component, fixture } = await setup();

    expect(fixture.debugElement.query(By.css('mat-card-header'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Edit"] mat-icon'))?.nativeElement.textContent.trim()).toBe('edit');
    expect(fixture.debugElement.query(By.css('button[aria-label="Update"]'))).toBeFalsy();

    component['onToggleEditMode']();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-card-content'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Update"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Edit"] mat-icon'))?.nativeElement.textContent.trim()).toBe('cancel');
  });

  it('renders pause icon when task is running', async () => {
    const { fixture, baseTask } = await setup();
    baseTask.lastTimeLog = buildTimeLog('2026-03-02T10:00:00.000Z');
    fixture.detectChanges();

    const icons = fixture.debugElement.queryAll(By.css('button.play-pause-button mat-icon'));
    expect(icons[1].nativeElement.textContent.trim()).toBe('pause');
  });

  it('renders tag chips in view mode and tag options in edit mode', async () => {
    const { fixture, component } = await setup();

    const viewChips = fixture.debugElement.queryAll(By.css('mat-chip-option'));
    expect(viewChips.length).toBe(2);

    component['onToggleEditMode']();
    fixture.detectChanges();

    const selectTrigger = fixture.debugElement.query(By.css('mat-select'));
    selectTrigger.nativeElement.click();
    fixture.detectChanges();

    const overlayText = document.body.textContent ?? '';
    expect(overlayText).toContain('Frontend');
    expect(overlayText).toContain('Backend');
  });

  it('uses DOM button clicks to trigger task actions', async () => {
    const { fixture, component } = await setup();
    const toggleSpy = vi.spyOn(component as any, 'onToggleTimeLogging');
    const modalSpy = vi.spyOn(component as any, 'onOpenTimeLogsModal');
    const editSpy = vi.spyOn(component as any, 'onToggleEditMode');
    const removeSpy = vi.spyOn(component as any, 'onRemove');

    fixture.debugElement.query(By.css('button[aria-label="Start Timer"]')).nativeElement.click();
    fixture.debugElement.query(By.css('button[aria-label="View Time Log History"]')).nativeElement.click();
    fixture.debugElement.query(By.css('button[aria-label="Remove"]')).nativeElement.click();
    fixture.debugElement.query(By.css('button[aria-label="Edit"]')).nativeElement.click();
    fixture.detectChanges();

    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(modalSpy).toHaveBeenCalledTimes(1);
    expect(editSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('submits update via DOM form submit in edit mode', async () => {
    const { fixture, component } = await setup();
    const updateSpy = vi.spyOn(component as any, 'onUpdate');

    component['onToggleEditMode']();
    component['taskFormModel'].update((value: { name: string; description: string; tags: Tag[] }) => ({
      ...value,
      name: 'Updated over DOM',
    }));
    component['taskForm']().markAsDirty();
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('submit', {});

    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});
