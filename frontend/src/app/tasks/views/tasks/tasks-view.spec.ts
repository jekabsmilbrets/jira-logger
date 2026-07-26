import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Storage } from '@core/services/storage';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { Tasks } from '@shared/services/tasks';

import { WorkLog } from '@tasks/services/work-log';

import { TasksView } from './tasks-view';

describe('Tasks Views tasks-view', () => {
  const buildTimeLog = (startIso: string, endIso?: string): TimeLog => new TimeLog({
    startTime: new Date(startIso),
    endTime: endIso ? new Date(endIso) : undefined,
  });

  const buildTask = (timeLogs: TimeLog[] = []): Task => {
    const task = new Task({ id: crypto.randomUUID(), name: 'Task', tags: [], timeLogs });
    task.lastTimeLog = timeLogs.at(-1);
    return task;
  };

  const setup = async (storedPageSize?: unknown) => {
    const tasksState = signal<Task[]>([]);
    const isLoadingState = signal(false);

    const tasksService = {
      isLoading: isLoadingState.asReadonly(),
      tasks: tasksState.asReadonly(),
      recentTasks: computed(() => [...tasksState()].sort((a: Task, b: Task) =>
        (b.lastTimeLogStartTime?.getTime() ?? -1) - (a.lastTimeLogStartTime?.getTime() ?? -1),
      )),
      allTasks: tasksState.asReadonly(),
      list: vi.fn(() => of([])),
      update: vi.fn(() => of(true)),
      delete: vi.fn(() => of(true)),
    };

    const workLogService = {
      toggleTaskWorkLog: vi.fn(() => of([])),
    };

    const storageService = {
      read: vi.fn(() => of(storedPageSize)),
      create: vi.fn(() => of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [TasksView],
      providers: [
        { provide: Storage, useValue: storageService },
        { provide: Tasks, useValue: tasksService },
        { provide: WorkLog, useValue: workLogService },
      ],
    })
      .compileComponents();

    const fixture = TestBed.createComponent(TasksView);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    return {
      fixture,
      component,
      tasksState,
      storageService,
      tasksService,
      workLogService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('uses recent tasks from Tasks', async () => {
    const { component, tasksState } = await setup();

    const newer = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);
    const older = buildTask([buildTimeLog('2026-03-01T10:00:00.000Z')]);

    tasksState.set([older, newer]);

    const sorted = component['tasks']();

    expect(sorted[0]).toBe(newer);
    expect(sorted[1]).toBe(older);
  });

  it('renders one tasks-task item per emitted task', async () => {
    const { fixture, tasksState } = await setup();
    const first = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);
    const second = buildTask([buildTimeLog('2026-03-01T10:00:00.000Z')]);

    tasksState.set([first, second]);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('tasks-task')).length).toBe(2);
  });

  it('paginates tasks with 5 items per page by default', async () => {
    const { fixture, tasksState } = await setup();

    tasksState.set(Array.from({ length: 6 }, () => buildTask()));
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.css('tasks-task')).length).toBe(5);

    fixture.debugElement.query(By.directive(MatPaginator)).componentInstance.page.emit({
      pageIndex: 1,
      previousPageIndex: 0,
      pageSize: 5,
      length: 6,
    });
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.css('tasks-task')).length).toBe(1);
  });

  it('restores and persists a supported page size', async () => {
    const { component, storageService } = await setup(25);

    expect(component['pageSize']()).toBe(25);
    expect(storageService.read).toHaveBeenCalledWith('tasks-view-page-size:v1', 'settings');

    component['onPageChange']({ pageIndex: 0, previousPageIndex: 0, pageSize: 50, length: 0 });

    expect(storageService.create).toHaveBeenCalledWith('tasks-view-page-size:v1', 50, 'settings');
  });

  it('falls back to the smallest page size for invalid stored values', async () => {
    const { component } = await setup(20);

    expect(component['pageSize']()).toBe(5);
  });

  it('returns to the first page when the task list changes', async () => {
    const { fixture, component, tasksState } = await setup();

    tasksState.set(Array.from({ length: 11 }, () => buildTask()));
    await fixture.whenStable();
    component['onPageChange']({ pageIndex: 1, previousPageIndex: 0, pageSize: 10, length: 11 });
    await fixture.whenStable();

    tasksState.set(Array.from({ length: 5 }, () => buildTask()));
    await fixture.whenStable();

    expect(component['pageIndex']()).toBe(0);
    expect(fixture.debugElement.queryAll(By.css('tasks-task')).length).toBe(5);
  });

  it('wires child tasks-task outputs to parent handlers', async () => {
    const { fixture, tasksState, component } = await setup();
    const task = buildTask([buildTimeLog('2026-03-02T10:00:00.000Z')]);
    const onActionSpy = vi.spyOn(component as any, 'onAction');
    const onSavedSpy = vi.spyOn(component as any, 'onTimeLogsSaved');

    tasksState.set([task]);
    fixture.detectChanges();

    const taskEl = fixture.debugElement.query(By.css('tasks-task'));
    const taskCmp = taskEl.componentInstance as any;
    taskCmp.action.emit(task);
    taskCmp.remove.emit(task);
    taskCmp.timeLogsSaved.emit();
    taskCmp.update.emit(task);
    taskEl.triggerEventHandler('remove', task);
    taskEl.triggerEventHandler('timeLogsSaved');
    taskEl.triggerEventHandler('update', task);

    expect(onActionSpy).toHaveBeenCalled();
    expect(onSavedSpy).toHaveBeenCalled();
  });

  it('delegates task actions to work-log workflow', async () => {
    const { component, workLogService } = await setup();
    const task = buildTask();

    component['onAction'](task);

    expect(workLogService.toggleTaskWorkLog).toHaveBeenCalledWith(task);
  });

  it('updates and removes tasks through Tasks', async () => {
    const { component, tasksService } = await setup();
    const task = buildTask();

    component['onUpdate'](task);
    component['onRemove'](task);

    expect(tasksService.update).toHaveBeenCalledWith(task);
    expect(tasksService.delete).toHaveBeenCalledWith(task);
  });

  it('refreshes tasks after time logs are saved in the modal', async () => {
    const { component, tasksService } = await setup();

    component['onTimeLogsSaved']();

    expect(tasksService.list).toHaveBeenCalledOnce();
  });
});
