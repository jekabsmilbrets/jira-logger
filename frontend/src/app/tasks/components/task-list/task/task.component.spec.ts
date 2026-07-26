import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TimeLogListService } from '@tasks/services/time-log-list.service';

import { JiraApiSettingsAdapter } from '@settings/adapters/jira-api-settings.adapter';
import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

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

  const setup = async (
    baseTask: Task = buildTask(),
    jiraSettings: Setting[] = [],
  ) => {

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
      allTasks: signal([baseTask]).asReadonly(),
      taskExist: vi.fn(() => of(null)),
    };

    const timeLogListService = {
      openTimeLogsListDialog: vi.fn(() => of(undefined)),
    };
    const settingsState = signal<Setting[]>(jiraSettings);

    await TestBed.configureTestingModule({
      imports: [TaskComponent],
      providers: [
        { provide: AreYouSureService, useValue: areYouSureService },
        { provide: TagsService, useValue: tagsService },
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogListService, useValue: timeLogListService },
        { provide: SettingsService, useValue: { settings: settingsState.asReadonly() } },
        JiraApiSettingsAdapter,
      ],
    })
      .compileComponents();

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
      timeLogListService,
      settingsState,
    };
  };

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('initializes its signal-form model from the input task', async () => {
    const { component, baseTask } = await setup();

    expect(component['taskFormSession'].draft().name).toBe(baseTask.name);
    expect(component['taskFormSession'].draft().description).toBe(baseTask.description);
    expect(component['taskFormSession'].draft().tags).toEqual(baseTask.tags);
  });

  it('returns true when tags have same id', async () => {
    const { component } = await setup();

    expect(component['isSameTag'](new Tag({ id: '1' }), new Tag({ id: '1' }))).toBe(true);
    expect(component['isSameTag'](new Tag({ id: '1' }), new Tag({ id: '2' }))).toBe(false);
  });

  it('toggles edit mode and resets form only when entering edit mode', async () => {
    const { component } = await setup();

    component['taskFormSession'].form.name().value.set('Modified name');
    component['taskFormSession'].form().markAsDirty();

    component['onToggleEditMode']();
    expect(component['editMode']()).toBe(true);
    expect(component['taskFormSession'].draft().name).toBe('Task name');

    component['onToggleEditMode']();
    expect(component['editMode']()).toBe(false);
  });

  it('emits update payload and exits edit mode on update', async () => {
    const { component, fixture } = await setup();
    const updateSpy = vi.spyOn(component['update'], 'emit');

    component['onToggleEditMode']();
    component['taskFormSession'].form.name().value.set('Updated name');
    component['taskFormSession'].form.description().value.set('Updated description');
    component['taskFormSession'].setTags([]);
    component['taskFormSession'].form().markAsDirty();
    await fixture.whenStable();
    component['onUpdate']();

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(component['editMode']()).toBe(false);
  });

  it('keeps unchanged task names valid without duplicate lookup', async () => {
    const { component, tasksService, fixture } = await setup();

    component['onToggleEditMode']();
    component['taskFormSession'].form.name().value.set(' Task name ');
    component['taskFormSession'].form().markAsDirty();
    await fixture.whenStable();

    component['onUpdate']();

    expect(tasksService.taskExist).not.toHaveBeenCalled();
  });

  it('emits remove only when confirmation is true', async () => {
    const { component, baseTask, areYouSureService } = await setup();
    const removeSpy = vi.spyOn(component['remove'], 'emit');

    await component['onRemove']();
    expect(removeSpy).toHaveBeenCalledWith(baseTask);

    areYouSureService.openDialog.mockReturnValueOnce(of(false));
    await component['onRemove']();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('emits task when toggling work logging', async () => {
    const { component, baseTask } = await setup();
    const actionSpy = vi.spyOn(component['action'], 'emit');

    component['onToggleTimeLogging']();

    expect(actionSpy).toHaveBeenCalledWith(baseTask);
  });

  it('emits timeLogsSaved when modal reports a successful save', async () => {
    const { component, timeLogListService } = await setup();
    timeLogListService.openTimeLogsListDialog.mockReturnValueOnce(of({
      saved: true,
    }) as any);

    const savedSpy = vi.spyOn(component['timeLogsSaved'], 'emit');

    await component['onOpenTimeLogsModal']();

    expect(savedSpy).toHaveBeenCalledOnce();
  });

  it('ignores undefined and unsaved modal responses when opening time logs modal', async () => {
    const { component, timeLogListService } = await setup();
    const savedSpy = vi.spyOn(component['timeLogsSaved'], 'emit');

    timeLogListService.openTimeLogsListDialog.mockReturnValueOnce(of(undefined));
    await component['onOpenTimeLogsModal']();

    timeLogListService.openTimeLogsListDialog.mockReturnValueOnce(of({ saved: false }) as any);
    await component['onOpenTimeLogsModal']();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('reuses cached lazy service promises for confirmation and time-log dialogs', async () => {
    const { component, areYouSureService, timeLogListService } = await setup();

    const firstConfirm = component['loadAreYouSureService']();
    const secondConfirm = component['loadAreYouSureService']();
    const [confirmServiceA, confirmServiceB] = await Promise.all([firstConfirm, secondConfirm]);
    expect(confirmServiceA).toBe(confirmServiceB);
    expect(confirmServiceA).toBe(areYouSureService);

    const firstList = component['loadTimeLogListService']();
    const secondList = component['loadTimeLogListService']();
    const [listServiceA, listServiceB] = await Promise.all([firstList, secondList]);
    expect(listServiceA).toBe(listServiceB);
    expect(listServiceA).toBe(timeLogListService);
  });

  it('renders non-edit mode controls and switches to edit mode controls', async () => {
    const { component, fixture } = await setup();
    const getUpdateButton = (): HTMLButtonElement => fixture.debugElement.query(By.css('button[aria-label="Save task"]')).nativeElement as HTMLButtonElement;

    expect(fixture.debugElement.query(By.css('mat-card-header'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Edit task"] mat-icon'))?.nativeElement.textContent.trim()).toBe('edit');
    expect(getUpdateButton().style.display).toBe('none');

    component['onToggleEditMode']();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-card-content'))).toBeTruthy();
    expect(getUpdateButton().style.display).toBe('');
    expect(fixture.debugElement.query(By.css('button[aria-label="Cancel editing"] mat-icon'))?.nativeElement.textContent.trim()).toBe('cancel');
  });

  it('renders pause icon when task is running', async () => {
    const { fixture, baseTask } = await setup();
    baseTask.lastTimeLog = buildTimeLog('2026-03-02T10:00:00.000Z');
    fixture.detectChanges();

    const icons = fixture.debugElement.queryAll(By.css('button.play-pause-button mat-icon'));
    expect(icons[1].nativeElement.textContent.trim()).toBe('pause');
  });

  it('renders active task total time and updates every ten seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-02T10:01:00.000Z'));

    const runningTimeLog = buildTimeLog('2026-03-02T10:00:00.000Z');
    const task = buildTask();
    task.timeLogs = [runningTimeLog];
    task.lastTimeLog = runningTimeLog;

    const { fixture } = await setup(task);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Total Time Worked: 1m');
    expect(fixture.nativeElement.textContent).not.toContain('Total Time Worked: 1m 0s');

    vi.advanceTimersByTime(10000);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Total Time Worked: 1m');
    expect(fixture.nativeElement.textContent).not.toContain('Total Time Worked: 1m 10s');
  });

  it('adds action button tooltips matching their aria labels', async () => {
    const { fixture, component, baseTask } = await setup();

    const expectButtonLabel = (selector: string, label: string): void => {
      const buttonDebugElement = fixture.debugElement.query(By.css(selector));
      const button: HTMLButtonElement = buttonDebugElement.nativeElement;
      const tooltip: MatTooltip = buttonDebugElement.injector.get(MatTooltip);

      expect(button.getAttribute('aria-label')).toBe(label);
      expect(tooltip.message).toBe(label);
    };

    expectButtonLabel('button.play-pause-button', 'Start timer');
    expectButtonLabel('button[aria-label="View time log history"]', 'View time log history');
    expectButtonLabel('button[aria-label="Edit task"]', 'Edit task');
    expectButtonLabel('button[aria-label="Save task"]', 'Save task');
    expectButtonLabel('button[aria-label="Remove task"]', 'Remove task');

    baseTask.lastTimeLog = buildTimeLog('2026-03-02T10:00:00.000Z');
    fixture.detectChanges();
    expectButtonLabel('button.play-pause-button', 'Stop timer');

    component['onToggleEditMode']();
    fixture.detectChanges();
    expectButtonLabel('button[aria-label="Cancel editing"]', 'Cancel editing');
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

  it('links Jira task names to the configured host in a new tab', async () => {
    const task = buildTask();
    task.name = ' abc_1-123 -#- old summary ';
    const { fixture } = await setup(task, [
      new Setting({ name: JiraApiSettings.enabled, value: 'true' }),
      new Setting({ name: JiraApiSettings.host, value: 'https://jira.example.test///' }),
    ]);

    const link: HTMLAnchorElement = fixture.debugElement
      .query(By.css('a[aria-label="Open task in Jira"]'))
      .nativeElement;

    expect(link.href).toBe('https://jira.example.test/browse/ABC_1-123');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('reactively hides Jira links when Jira is disabled and for non-Jira task names', async () => {
    const task = buildTask();
    task.name = 'ABC-123';
    const { fixture, settingsState } = await setup(task, [
      new Setting({ name: JiraApiSettings.enabled, value: 'true' }),
      new Setting({ name: JiraApiSettings.host, value: 'https://jira.example.test' }),
    ]);
    const findLink = () => fixture.debugElement.query(By.css('a[aria-label="Open task in Jira"]'));

    expect(findLink()).not.toBeNull();

    settingsState.set([
      new Setting({ name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ name: JiraApiSettings.host, value: 'https://jira.example.test' }),
    ]);
    fixture.detectChanges();
    expect(findLink()).toBeNull();

    task.name = 'ordinary task';
    settingsState.set([
      new Setting({ name: JiraApiSettings.enabled, value: 'true' }),
      new Setting({ name: JiraApiSettings.host, value: 'https://jira.example.test' }),
    ]);
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
    expect(findLink()).toBeNull();
  });

  it('does not create Jira links for non-HTTP hosts', async () => {
    const task = buildTask();
    task.name = 'ABC-123';
    const { fixture } = await setup(task, [
      new Setting({ name: JiraApiSettings.enabled, value: 'true' }),
      new Setting({ name: JiraApiSettings.host, value: 'javascript:alert(1)' }),
    ]);

    expect(fixture.debugElement.query(By.css('a[aria-label="Open task in Jira"]'))).toBeNull();
  });

  it('uses DOM button clicks to trigger task actions', async () => {
    const { fixture, component } = await setup();
    const toggleSpy = vi.spyOn(component as any, 'onToggleTimeLogging');
    const modalSpy = vi.spyOn(component as any, 'onOpenTimeLogsModal');
    const editSpy = vi.spyOn(component as any, 'onToggleEditMode');
    const removeSpy = vi.spyOn(component as any, 'onRemove');

    fixture.debugElement.query(By.css('button[aria-label="Start timer"]')).nativeElement.click();
    fixture.debugElement.query(By.css('button[aria-label="View time log history"]')).nativeElement.click();
    fixture.debugElement.query(By.css('button[aria-label="Remove task"]')).nativeElement.click();
    fixture.debugElement.query(By.css('button[aria-label="Edit task"]')).nativeElement.click();
    fixture.detectChanges();
    await Promise.all([
      modalSpy.mock.results[0]?.value,
      removeSpy.mock.results[0]?.value,
    ]);

    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(modalSpy).toHaveBeenCalledTimes(1);
    expect(editSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('submits update via DOM form submit in edit mode', async () => {
    const { fixture, component } = await setup();
    const updateSpy = vi.spyOn(component as any, 'onUpdate');

    component['onToggleEditMode']();
    component['taskFormSession'].form.name().value.set('Updated over DOM');
    component['taskFormSession'].form().markAsDirty();
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('submit', {});

    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  it('updates selected tags through the tags-change handler', async () => {
    const { component } = await setup();
    const tags = [new Tag({ id: '2', name: 'Backend' })];

    component['onTagsChange'](tags);

    expect(component['taskFormSession'].draft().tags).toEqual(tags);
  });

  it('marks invalid updates as touched without emitting', async () => {
    const { component } = await setup();
    const updateSpy = vi.spyOn(component['update'], 'emit');
    component['taskFormSession'].form.name().value.set('');

    component['onUpdate']();

    expect(component['taskFormSession'].form().touched()).toBe(true);
    expect(component['hasNameError']()).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
