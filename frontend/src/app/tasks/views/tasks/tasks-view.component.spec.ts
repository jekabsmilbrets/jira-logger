import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TasksService } from '@shared/services/tasks.service';

import { TasksSettingsService } from '@tasks/services/tasks-settings.service';
import { WorkLogService } from '@tasks/services/work-log.service';

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

    await TestBed.configureTestingModule({
      imports: [TasksViewComponent],
      providers: [
        { provide: TasksService, useValue: tasksService },
        { provide: WorkLogService, useValue: workLogService },
        { provide: TasksSettingsService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(TasksViewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    return {
      fixture,
      component,
      tasksState,
      tasksService,
      workLogService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('uses recent tasks from TasksService', async () => {
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

  it('updates and removes tasks through TasksService', async () => {
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
