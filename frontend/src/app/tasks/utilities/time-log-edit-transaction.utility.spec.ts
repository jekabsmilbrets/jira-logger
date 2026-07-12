import { firstValueFrom, of, throwError } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogEditTransaction } from './time-log-edit-transaction.utility';

describe('Tasks Utility TimeLogEditTransaction', () => {
  const buildTimeLog = (id: string | undefined, startIso: string): TimeLog => new TimeLog({
    id,
    startTime: new Date(startIso),
    endTime: new Date(startIso),
  });

  it('tracks create, update, remove and saves in order', async () => {
    const task = new Task({ id: 'task-1', timeLogs: [] } as any);
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const removed = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T12:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const persistedCreated = buildTimeLog('created-id', '2026-03-02T09:00:00.000Z');
    const transaction = new TimeLogEditTransaction([existing, removed]);
    const timeLogsAdapter = {
      create: vi.fn(() => of(persistedCreated)),
      update: vi.fn(() => of(updated)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of([persistedCreated, updated])),
    };

    transaction.create(created);
    transaction.update(existing, updated);
    transaction.remove(removed);

    await expect(firstValueFrom(transaction.save(task, timeLogsAdapter))).resolves.toEqual([persistedCreated, updated]);
    expect(timeLogsAdapter.create).toHaveBeenCalledWith(task, created);
    expect(timeLogsAdapter.update).toHaveBeenCalledWith(task, updated);
    expect(timeLogsAdapter.delete).toHaveBeenCalledWith(task, removed);
    expect(transaction.timeLogs()).toEqual([persistedCreated, updated]);
    expect(transaction.hasChanges()).toBe(false);
  });

  it('keeps staged changes when save fails', async () => {
    const task = new Task({ id: 'task-1', timeLogs: [] } as any);
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const transaction = new TimeLogEditTransaction([]);
    const timeLogsAdapter = {
      create: vi.fn(() => throwError(() => new Error('fail'))),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    transaction.create(created);

    await expect(firstValueFrom(transaction.save(task, timeLogsAdapter))).rejects.toThrow('fail');
    expect(transaction.timeLogs()).toEqual([created]);
    expect(transaction.hasChanges()).toBe(true);
  });

  it('tracks edits through the transaction seam', () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T12:00:00.000Z');
    const transaction = new TimeLogEditTransaction([existing]);

    transaction.update(existing, updated);
    transaction.create(created);
    transaction.remove(updated);

    expect(transaction.timeLogs()).toEqual([created]);
    expect(transaction.hasChanges()).toBe(true);
  });

  it('adds created time logs', () => {
    const created = buildTimeLog('new', '2026-03-02T12:00:00.000Z');
    const transaction = new TimeLogEditTransaction([]);

    transaction.create(created);

    expect(transaction.timeLogs()).toEqual([created]);
  });

  it('updates created logs in place and ignores unknown logs', () => {
    const created = buildTimeLog(undefined, '2026-03-02T10:00:00.000Z');
    const replacement = buildTimeLog(undefined, '2026-03-02T11:00:00.000Z');
    const transaction = new TimeLogEditTransaction([]);

    transaction.update(buildTimeLog('missing', '2026-03-02T09:00:00.000Z'), replacement);
    transaction.create(created);
    transaction.update(created, replacement);

    expect(transaction.timeLogs()).toEqual([replacement]);
    expect(transaction.hasChanges()).toBe(true);
  });

  it('does not persist removals for unsaved or duplicate logs and resets staged changes', () => {
    const saved = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T11:00:00.000Z');
    const transaction = new TimeLogEditTransaction([saved]);

    transaction.remove(buildTimeLog('missing', '2026-03-02T09:00:00.000Z'));
    transaction.create(created);
    transaction.remove(created);
    transaction.remove(saved);
    transaction.remove(saved);
    transaction.reset([saved]);

    expect(transaction.timeLogs()).toEqual([saved]);
    expect(transaction.hasChanges()).toBe(false);
  });

  it('returns current values without saving when no operations are staged', async () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const transaction = new TimeLogEditTransaction([existing]);
    const timeLogsAdapter = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), list: vi.fn() };

    await expect(firstValueFrom(transaction.save(new Task({ id: 'task-1', timeLogs: [] } as any), timeLogsAdapter as any)))
      .resolves.toEqual([existing]);
    expect(timeLogsAdapter.list).not.toHaveBeenCalled();
  });

  it('accepts persistence operations that do not return time logs', async () => {
    const original = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T12:00:00.000Z');
    const transaction = new TimeLogEditTransaction([original]);
    const timeLogsAdapter = {
      create: vi.fn(() => of(undefined)),
      update: vi.fn(() => of(undefined)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of([updated])),
    };

    transaction.create(created);
    transaction.update(original, updated);
    await expect(firstValueFrom(transaction.save(new Task({ id: 'task-1', timeLogs: [] } as any), timeLogsAdapter as any)))
      .resolves.toEqual([updated]);
  });

  it('replaces an already-staged update when edited again', () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const firstUpdate = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    const secondUpdate = buildTimeLog('1', '2026-03-02T12:00:00.000Z');
    const transaction = new TimeLogEditTransaction([existing]);

    transaction.update(existing, firstUpdate);
    transaction.update(firstUpdate, secondUpdate);

    expect(transaction.timeLogs()).toEqual([secondUpdate]);
  });

  it('does not duplicate a deleted log and tolerates a missing replacement target', async () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    const transaction = new TimeLogEditTransaction([existing]);

    transaction.remove(existing);
    (transaction as any).timeLogsState.set([existing]);
    transaction.remove(existing);
    transaction.update(existing, updated);
    (transaction as any).timeLogsState.set([]);

    const adapter = {
      create: vi.fn(),
      update: vi.fn(() => of(updated)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of([])),
    };
    await firstValueFrom(transaction.save(new Task({ id: 'task-1', timeLogs: [] } as any), adapter as any));

    expect(transaction.hasChanges()).toBe(false);
  });
});
