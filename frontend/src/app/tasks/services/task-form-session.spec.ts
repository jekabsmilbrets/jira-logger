import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type Observable, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Task } from '@shared/models/task.model';

import { TaskFormSession } from './task-form-session';

describe('TaskFormSession', () => {
  const sourceTags = [
    { id: '1', name: 'Backend' },
    { id: '2', name: 'Frontend' },
  ] as any;

  const sourceTimeLogs = [
    {
      startTime: new Date('2024-01-01T10:00:00.000Z'),
      endTime: new Date('2024-01-01T10:30:00.000Z'),
    },
  ] as any;

  const buildSourceTask = (overrides: Partial<Task> = {}): Task => new Task({
    id: 'task-1' as any,
    name: 'Source name',
    description: 'Source description',
    tags: sourceTags,
    timeLogs: sourceTimeLogs,
    jiraWorkLogs: [{ id: 'wl-1' } as any],
    ...overrides,
  });

  const createSession = (
    checkName: (name: string) => Observable<unknown> = vi.fn(() => of(undefined)),
  ): TaskFormSession => TestBed.runInInjectionContext(() => TaskFormSession.create(checkName));

  const editSession = (
    sourceTask = signal(buildSourceTask()),
    checkName: (name: string) => Observable<unknown> = vi.fn(() => of(undefined)),
  ): TaskFormSession => {
    const session = TestBed.runInInjectionContext(() => TaskFormSession.edit(sourceTask, checkName));
    TestBed.tick();

    return session;
  };

  afterEach(() => vi.useRealTimers());

  it('initializes create and edit drafts with fresh Tags arrays', () => {
    const firstCreate = createSession();
    const secondCreate = createSession();
    const sourceTask = buildSourceTask();
    const edit = editSession(signal(sourceTask));

    expect(firstCreate.draft()).toEqual({
      name: '',
      description: '',
      tags: [],
    });
    expect(firstCreate.draft().tags).not.toBe(secondCreate.draft().tags);
    expect(edit.draft()).toEqual({
      name: sourceTask.name,
      description: sourceTask.description,
      tags: sourceTask.tags,
    });
    expect(edit.draft().tags).not.toBe(sourceTask.tags);
  });

  it('requires a Task name', () => {
    const session = createSession();

    session.form.name().value.set('');
    TestBed.tick();

    expect(session.form.name().invalid()).toBe(true);
    expect(session.form.name().errors()).toContainEqual(expect.objectContaining({
      message: 'Task name is required.',
    }));
  });

  it('debounces normalized create lookups and suppresses blank names', async () => {
    vi.useFakeTimers();
    const checkName = vi.fn(() => of(undefined));
    const session = createSession(checkName);

    session.form.name().value.set('   ');
    await vi.advanceTimersByTimeAsync(301);
    TestBed.tick();
    expect(checkName).not.toHaveBeenCalled();

    session.form.name().value.set('  New task  ');
    await vi.advanceTimersByTimeAsync(299);
    expect(checkName).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    TestBed.tick();

    expect(checkName).toHaveBeenCalledOnce();
    expect(checkName).toHaveBeenCalledWith('New task');
  });

  it('skips unchanged edit names and checks changed names without create debounce', () => {
    const checkName = vi.fn(() => of(undefined));
    const session = editSession(signal(buildSourceTask()), checkName);

    session.form.name().value.set(' Source name ');
    TestBed.tick();
    expect(checkName).not.toHaveBeenCalled();

    session.form.name().value.set('Different task');
    TestBed.tick();
    expect(checkName).toHaveBeenCalledWith('Different task');
  });

  it('reports conflicts and arbitrary lookup failures as Task already exists', async () => {
    vi.useFakeTimers();
    const conflict = createSession(() => throwError(() => ({ status: 409 })));
    conflict.form.name().value.set('Existing task');
    await vi.advanceTimersByTimeAsync(301);
    TestBed.tick();

    expect(conflict.form.name().errors()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'duplicate-task',
        message: 'Task already exists.',
      }),
    ]));

    const failure = createSession(() => throwError(() => new Error('network unavailable')));
    failure.form.name().value.set('Unverifiable task');
    await vi.advanceTimersByTimeAsync(301);
    TestBed.tick();

    expect(failure.form.name().errors()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'duplicate-task',
        message: 'Task already exists.',
      }),
    ]));

    const available = createSession(() => of(undefined));
    available.form.name().value.set('Available task');
    await vi.advanceTimersByTimeAsync(301);
    TestBed.tick();

    expect(available.form.name().errors()).toEqual([]);
  });

  it('sets Tags and marks their field dirty and touched', () => {
    const session = createSession();

    session.setTags(sourceTags);

    expect(session.draft().tags).toEqual(sourceTags);
    expect(session.form.tags().dirty()).toBe(true);
    expect(session.form.tags().touched()).toBe(true);
  });

  it('converts a create draft without trimming the entered name and resets fresh state', () => {
    const session = createSession();

    session.form.name().value.set('  Exact task name  ');
    session.form.description().value.set('Description');
    session.setTags(sourceTags);

    const task = session.toTask();

    expect(task.name).toBe('  Exact task name  ');
    expect(task.description).toBe('Description');
    expect(task.tags).toEqual(sourceTags);
    expect(task.tags).not.toBe(sourceTags);

    session.reset();
    expect(session.draft()).toEqual({
      name: '',
      description: '',
      tags: [],
    });
    expect(session.draft().tags).not.toBe(sourceTags);
  });

  it('preserves active edits and merges them onto the latest source Task', () => {
    const original = buildSourceTask();
    const sourceTask = signal(original);
    const session = editSession(sourceTask);

    session.form.name().value.set('  Edited name  ');
    session.form.description().value.set('Edited description');
    session.setTags([{ id: '3', name: 'Ops' }] as any);

    const latestTimeLogs = [{
      startTime: new Date('2024-01-02T10:00:00.000Z'),
      endTime: new Date('2024-01-02T11:00:00.000Z'),
    }] as any;
    const latestJiraWorkLogs = [{ id: 'wl-2' }] as any;
    const latest = buildSourceTask({
      description: 'Latest source description',
      timeLogs: latestTimeLogs,
      jiraWorkLogs: latestJiraWorkLogs,
    });

    sourceTask.set(latest);
    TestBed.tick();

    expect(session.draft().name).toBe('  Edited name  ');
    expect(session.draft().description).toBe('Edited description');
    expect(session.draft().tags).toHaveLength(1);
    expect(session.draft().tags[0]).toMatchObject({ id: '3', name: 'Ops' });

    const updated = session.toTask();

    expect(updated.name).toBe('  Edited name  ');
    expect(updated.description).toBe('Edited description');
    expect(updated.tags).toHaveLength(1);
    expect(updated.tags[0]).toMatchObject({ id: '3', name: 'Ops' });
    expect(updated.tags).not.toBe(session.draft().tags);
    expect(updated.timeLogs).toEqual(latestTimeLogs);
    expect(updated.timeLogs).not.toBe(latestTimeLogs);
    expect(updated.jiraWorkLogs).toEqual(latestJiraWorkLogs);
    expect(updated.jiraWorkLogs).not.toBe(latestJiraWorkLogs);
    expect(updated.timeLogged).toBe(3600);

    session.reset();
    expect(session.draft()).toEqual({
      name: latest.name,
      description: latest.description,
      tags: latest.tags,
    });
    expect(session.draft().tags).not.toBe(latest.tags);
  });
});
