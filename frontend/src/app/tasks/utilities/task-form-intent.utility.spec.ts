import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import {
  buildDuplicateTaskNameError,
  buildEmptyTaskFormValue,
  buildTaskCreateForm,
  buildTaskCreatePayload,
  buildTaskEditForm,
  buildTaskFormValue,
  buildTaskUpdatePayload,
  createDuplicateTaskNameValidator,
  isDuplicateTaskName,
  normalizeTaskNameForDuplicateCheck,
  setTaskFormTags,
} from './task-form-intent.utility';

describe('Tasks Utils task-form-intent.util', () => {
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

  const sourceTask = {
    id: 'task-1' as any,
    name: 'Source name',
    description: 'Source description',
    tags: sourceTags,
    timeLogs: sourceTimeLogs,
    jiraWorkLogs: [{ id: 'wl-1' } as any],
  } as any;

  it('buildTaskUpdatePayload updates provided fields and preserves immutable clones', () => {
    const updatedTags = [{ id: '3', name: 'Ops' }] as any;

    const out = buildTaskUpdatePayload(sourceTask, {
      name: 'Updated name',
      description: 'Updated description',
      tags: updatedTags,
    });

    expect(out.name).toBe('Updated name');
    expect(out.description).toBe('Updated description');
    expect(out.tags).toEqual(updatedTags);
    expect(out.tags).not.toBe(updatedTags);
    expect(out.timeLogs).toEqual(sourceTask.timeLogs);
    expect(out.timeLogs).not.toBe(sourceTask.timeLogs);
    expect(out.jiraWorkLogs).toEqual(sourceTask.jiraWorkLogs);
    expect(out.jiraWorkLogs).not.toBe(sourceTask.jiraWorkLogs);
    expect(out.timeLogged).toBe(1800);
  });

  it('buildTaskFormValue creates editable form state from a task', () => {
    const out = buildTaskFormValue(sourceTask);

    expect(out).toEqual({
      name: sourceTask.name,
      description: sourceTask.description,
      tags: sourceTask.tags,
    });
    expect(out.tags).not.toBe(sourceTask.tags);
  });

  it('buildTaskCreatePayload creates a task from form state', () => {
    const out = buildTaskCreatePayload({
      ...buildEmptyTaskFormValue(),
      name: 'New task',
      tags: sourceTags,
    });

    expect(out.name).toBe('New task');
    expect(out.tags).toEqual(sourceTags);
  });

  it('buildEmptyTaskFormValue returns fresh tag arrays', () => {
    expect(buildEmptyTaskFormValue().tags).not.toBe(buildEmptyTaskFormValue().tags);
  });

  it('isDuplicateTaskName ignores the source task when editing', () => {
    const otherTask = {
      id: 'task-2',
      name: 'Other task',
    } as any;

    expect(isDuplicateTaskName([sourceTask, otherTask], sourceTask.name, sourceTask)).toBe(false);
    expect(isDuplicateTaskName([sourceTask, otherTask], otherTask.name, sourceTask)).toBe(true);
  });

  it('normalizes duplicate-name checks and builds the shared duplicate error', () => {
    expect(normalizeTaskNameForDuplicateCheck('  Existing task  ')).toBe('Existing task');
    expect(normalizeTaskNameForDuplicateCheck('   ')).toBeUndefined();
    expect(buildDuplicateTaskNameError(true)).toEqual({
      kind: 'duplicate-task',
      message: 'Task already exists.',
    });
    expect(buildDuplicateTaskNameError(false)).toBeNull();
    expect(buildDuplicateTaskNameError(undefined)).toBeNull();
  });

  it('setTaskFormTags updates selection and marks the form field touched', () => {
    const field = {
      value: { set: vi.fn() },
      markAsDirty: vi.fn(),
      markAsTouched: vi.fn(),
    };

    setTaskFormTags(field, sourceTags);

    expect(field.value.set).toHaveBeenCalledWith(sourceTags);
    expect(field.markAsDirty).toHaveBeenCalledOnce();
    expect(field.markAsTouched).toHaveBeenCalledWith({ skipDescendants: true });
  });

  it('buildTaskUpdatePayload falls back to source values for non-string name/description and non-array tags', () => {
    const out = buildTaskUpdatePayload(sourceTask, {
      name: null,
      description: null,
      tags: null,
    });

    expect(out.name).toBe(sourceTask.name);
    expect(out.description).toBe(sourceTask.description);
    expect(out.tags).toEqual(sourceTask.tags);
    expect(out.tags).not.toBe(sourceTask.tags);
  });

  it('returns a non-duplicate result when the validator has no name', () => {
    const checkName = vi.fn();
    const validator = TestBed.runInInjectionContext(() => createDuplicateTaskNameValidator(signal<string | undefined>(undefined), checkName));

    TestBed.tick();
    expect(validator.value()).toBeUndefined();
    expect(checkName).not.toHaveBeenCalled();
  });

  it('checks named validator resources and treats check errors as duplicates', () => {
    const name = signal<string | undefined>('Existing task');
    const checkName = vi.fn(() => of(undefined));
    const validator = TestBed.runInInjectionContext(() => createDuplicateTaskNameValidator(name, checkName));

    TestBed.tick();
    expect(checkName).toHaveBeenCalledWith('Existing task');
    expect(validator.value()).toBe(false);

    const failingValidator = TestBed.runInInjectionContext(() => createDuplicateTaskNameValidator(signal('Existing task'), () => throwError(() => new Error('duplicate'))));
    TestBed.tick();
    expect(failingValidator.value()).toBe(true);
  });

  it('builds create and edit forms with duplicate-check intent', async () => {
    const createModel = signal({ name: 'New task', description: '', tags: [] as any[] });
    const editModel = signal({ name: sourceTask.name, description: '', tags: [] as any[] });
    const source = signal(sourceTask);
    const checkName = vi.fn(() => of(undefined));

    const createForm = TestBed.runInInjectionContext(() => buildTaskCreateForm(createModel, checkName));
    const editForm = TestBed.runInInjectionContext(() => buildTaskEditForm(editModel, source, checkName));
    createForm.name().value.set('Another task');
    editForm.name().value.set('Different task');
    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(301);
    TestBed.tick();
    vi.useRealTimers();

    expect(checkName).toHaveBeenCalledWith('Another task');
    expect(checkName).toHaveBeenCalledWith('Different task');
    expect(checkName).not.toHaveBeenCalledWith(sourceTask.name);
  });

});
