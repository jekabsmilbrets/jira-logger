import { firstValueFrom, of, throwError } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogEditTransaction } from './time-log-edit-transaction';

describe('TimeLogEditTransaction', () => {
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
    const timeLogsService = {
      create: vi.fn(() => of(persistedCreated)),
      update: vi.fn(() => of(updated)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of([persistedCreated, updated])),
    } as any;

    transaction.create(created);
    transaction.update(existing, updated);
    transaction.remove(removed);

    await expect(firstValueFrom(transaction.save(task, timeLogsService))).resolves.toEqual([persistedCreated, updated]);
    expect(timeLogsService.create).toHaveBeenCalledWith(task, created);
    expect(timeLogsService.update).toHaveBeenCalledWith(task, updated);
    expect(timeLogsService.delete).toHaveBeenCalledWith(task, removed);
    expect(transaction.timeLogs()).toEqual([persistedCreated, updated]);
    expect(transaction.hasChanges()).toBe(false);
  });

  it('keeps staged changes when save fails', async () => {
    const task = new Task({ id: 'task-1', timeLogs: [] } as any);
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const transaction = new TimeLogEditTransaction([]);
    const timeLogsService = {
      create: vi.fn(() => throwError(() => new Error('fail'))),
    } as any;

    transaction.create(created);

    await expect(firstValueFrom(transaction.save(task, timeLogsService))).rejects.toThrow('fail');
    expect(transaction.timeLogs()).toEqual([created]);
    expect(transaction.hasChanges()).toBe(true);
  });
});
