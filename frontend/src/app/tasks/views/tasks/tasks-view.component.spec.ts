import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DynamicMenuService } from '@core/services/dynamic-menu.service';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';
import { TaskUpdateActionEnum } from '@tasks/enums/task-update-action.enum';
import { TasksSettingsService } from '@tasks/services/tasks-settings.service';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TasksViewComponent } from './tasks-view.component';

describe('Tasks Views tasks-view.component', () => {
  const buildTimeLog = (startIso: string, endIso?: string): TimeLog => new TimeLog({
    startTime: new Date(startIso),
    endTime: endIso ? new Date(endIso) : undefined,
  });

  const buildTask = (timeLogs: TimeLog[] = []): Task => {
    const task = new Task({ id: crypto.randomUUID(), name: 'Task', tags: [], timeLogs });
    task.lastTimeLog = timeLogs.at(-1);
    return task;
  };

  const setup = async () => {
    const tasksSubject = new BehaviorSubject<Task[]>([]);

    const tasksService = {
      isLoading$: of(false),
      tasks$: tasksSubject.asObservable(),
      list: vi.fn(() => of([])),
      update: vi.fn(() => of(true)),
      delete: vi.fn(() => of(true)),
    };

    const timeLogsService = {
      start: vi.fn(() => of(true)),
      stop: vi.fn(() => of(true)),
      create: vi.fn(() => of(true)),
      update: vi.fn(() => of(true)),
      delete: vi.fn(() => of(true)),
    };

    const dynamicMenuService = {
      addDynamicMenu: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TasksViewComponent],
      providers: [
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogsService, useValue: timeLogsService },
        { provide: DynamicMenuService, useValue: dynamicMenuService },
        { provide: TasksSettingsService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(TasksViewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    return {
      fixture,
      component,
      tasksSubject,
      tasksService,
      timeLogsService,
      dynamicMenuService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('adds tasks menu on init', async () => {
    const { component, dynamicMenuService, tasksService } = await setup();

    component.ngOnInit();

    expect(dynamicMenuService.addDynamicMenu).toHaveBeenCalled();
    const [menu] = dynamicMenuService.addDynamicMenu.mock.calls[0];
    expect(menu.data.route).toBe('/tasks');
    expect(menu.data.providers).toContainEqual(expect.objectContaining({ provide: TasksService, useValue: tasksService }));
  });

  it('sorts tasks by latest time log descending', async () => {
    const { component, tasksSubject } = await setup();

    const newer = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);
    const older = buildTask([buildTimeLog('2026-03-01T10:00:00.000Z')]);

    tasksSubject.next([older, newer]);

    const sorted = await firstValueFrom(component['tasks$']);

    expect(sorted[0]).toBe(newer);
    expect(sorted[1]).toBe(older);
  });

  it('renders one tasks-task item per emitted task', async () => {
    const { fixture, tasksSubject } = await setup();
    const first = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);
    const second = buildTask([buildTimeLog('2026-03-01T10:00:00.000Z')]);

    tasksSubject.next([first, second]);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('tasks-task')).length).toBe(2);
  });

  it('wires child tasks-task outputs to parent handlers', async () => {
    const { fixture, tasksSubject, component } = await setup();
    const task = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);
    const log = buildTimeLog('2026-03-02T11:00:00.000Z');
    const onActionSpy = vi.spyOn(component as any, 'onAction');
    const onCreateSpy = vi.spyOn(component as any, 'onCreateTimeLog');
    const onUpdateSpy = vi.spyOn(component as any, 'onUpdateTimeLog');
    const onRemoveSpy = vi.spyOn(component as any, 'onRemoveTimeLog');

    tasksSubject.next([task]);
    fixture.detectChanges();

    const taskEl = fixture.debugElement.query(By.css('tasks-task'));
    const taskCmp = taskEl.componentInstance as any;
    taskCmp.action.emit([task, TaskUpdateActionEnum.startWorkLog]);
    taskCmp.createTimeLog.emit([task, log]);
    taskCmp.remove.emit(task);
    taskCmp.update.emit(task);
    taskCmp.removeTimeLog.emit([task, log]);
    taskEl.triggerEventHandler('createTimeLog', [task, log]);
    taskEl.triggerEventHandler('remove', task);
    taskEl.triggerEventHandler('update', task);
    taskEl.triggerEventHandler('removeTimeLog', [task, log]);
    taskEl.triggerEventHandler('updateTimeLog', [task, log]);

    expect(onActionSpy).toHaveBeenCalled();
    expect(onCreateSpy).toHaveBeenCalled();
    expect(onUpdateSpy).toHaveBeenCalled();
    expect(onRemoveSpy).toHaveBeenCalled();
  });

  it('refreshes list for unknown action via default switch branch', async () => {
    const { component, timeLogsService, tasksService } = await setup();
    const task = buildTask();

    component['onAction']([task, 'unknown-action' as TaskUpdateActionEnum]);

    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('starts time logging and refreshes tasks on start action', async () => {
    const { component, timeLogsService, tasksService } = await setup();
    const task = buildTask();

    component['onAction']([task, TaskUpdateActionEnum.startWorkLog]);

    expect(timeLogsService.start).toHaveBeenCalledWith(task);
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('stops time logging and refreshes tasks when running', async () => {
    const { component, timeLogsService, tasksService } = await setup();
    const task = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);

    component['onAction']([task, TaskUpdateActionEnum.stopWorkLog]);

    expect(timeLogsService.stop).toHaveBeenCalledWith(task);
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('skips stop call when task is not running and still refreshes list', async () => {
    const { component, timeLogsService, tasksService } = await setup();
    const task = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z', '2026-03-02T11:00:00.000Z')]);

    component['onAction']([task, TaskUpdateActionEnum.stopWorkLog]);

    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(tasksService.list).toHaveBeenCalledOnce();
  });

  it('updates and removes tasks through TasksService', async () => {
    const { component, tasksService } = await setup();
    const task = buildTask();

    component['onUpdate'](task);
    component['onRemove'](task);

    expect(tasksService.update).toHaveBeenCalledWith(task);
    expect(tasksService.delete).toHaveBeenCalledWith(task);
  });

  it('creates, updates, and removes time logs then refreshes tasks', async () => {
    const { component, timeLogsService, tasksService } = await setup();
    const task = buildTask();
    const timeLog = buildTimeLog('2026-03-02T10:00:00.000Z');

    component['onCreateTimeLog']([task, timeLog]);
    component['onUpdateTimeLog']([task, timeLog]);
    component['onRemoveTimeLog']([task, timeLog]);

    expect(timeLogsService.create).toHaveBeenCalledWith(task, timeLog);
    expect(timeLogsService.update).toHaveBeenCalledWith(task, timeLog);
    expect(timeLogsService.delete).toHaveBeenCalledWith(task, timeLog);
    expect(tasksService.list).toHaveBeenCalledTimes(3);
  });
});
