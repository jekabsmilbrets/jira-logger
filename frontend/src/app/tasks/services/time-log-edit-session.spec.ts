import { firstValueFrom, of, throwError } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import type { TimeLogEdit } from '@tasks/services/time-log-edit';
import { TimeLogEditSession } from '@tasks/services/time-log-edit-session';

describe('Tasks Service TimeLogEditSession', () => {
  const buildTimeLog = (id: string | undefined, startIso: string): TimeLog => new TimeLog({
    id,
    startTime: new Date(startIso),
    endTime: new Date(startIso),
  });

  const buildEditService = () => ({
    openTimeLogDialog: vi.fn(() => of({ responseType: 'cancel' })),
  }) as unknown as TimeLogEdit & {
    openTimeLogDialog: ReturnType<typeof vi.fn>;
  };
  const buildAdapter = (timeLogs: TimeLog[] = []) => ({
    create: vi.fn((_: Task, timeLog: TimeLog) => of(timeLog)),
    update: vi.fn((_: Task, timeLog: TimeLog) => of(timeLog)),
    delete: vi.fn(() => of(undefined)),
    list: vi.fn(() => of(timeLogs)),
  });
  const buildTask = (timeLogs: TimeLog[] = []) => new Task({ id: 'task-1', timeLogs } as any);

  it('applies edit dialog updates, deletes, and ignored responses inside the session', () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    const session = new TimeLogEditSession(buildTask([existing]), buildAdapter());
    const editService = buildEditService();

    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: updated,
    }));
    session.edit(existing, editService);
    expect(session.timeLogs()).toEqual([updated]);

    editService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'cancel' }));
    session.edit(updated, editService);
    expect(session.timeLogs()).toEqual([updated]);

    editService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'delete' }));
    session.edit(updated, editService);
    expect(session.timeLogs()).toEqual([]);
  });

  it('adds a new Time Log through the edit dialog response', () => {
    const created = buildTimeLog(undefined, '2026-03-02T12:00:00.000Z');
    const session = new TimeLogEditSession(buildTask(), buildAdapter());
    const editService = buildEditService();

    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));
    session.add(editService);

    expect(session.timeLogs()).toEqual([created]);
  });

  it('saves created, updated, and deleted Time Logs and returns a close response', async () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const removed = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T12:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const persistedCreated = buildTimeLog('created-id', '2026-03-02T09:00:00.000Z');
    const task = buildTask([existing, removed]);
    const editService = buildEditService();
    const timeLogsAdapter = {
      create: vi.fn(() => of(persistedCreated)),
      update: vi.fn(() => of(updated)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of([persistedCreated, updated])),
    };
    const session = new TimeLogEditSession(task, timeLogsAdapter);

    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));
    session.add(editService);
    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: updated,
    }));
    session.edit(existing, editService);
    session.remove(removed);

    await expect(firstValueFrom(session.save())).resolves.toEqual({
      close: true,
      message: 'Time logs updated.',
      response: {
        saved: true,
        timeLogs: [persistedCreated, updated],
      },
    });
    expect(timeLogsAdapter.create).toHaveBeenCalledWith(task, created);
    expect(timeLogsAdapter.update).toHaveBeenCalledWith(task, updated);
    expect(timeLogsAdapter.delete).toHaveBeenCalledWith(task, removed);
    expect(session.timeLogs()).toEqual([persistedCreated, updated]);
  });

  it('keeps the session open with a failure message when save fails', async () => {
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const editService = buildEditService();
    const timeLogsAdapter = {
      create: vi.fn(() => throwError(() => ({ error: { errors: ['Can not Create TimeLog'] } }))),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };
    const session = new TimeLogEditSession(buildTask(), timeLogsAdapter);

    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));
    session.add(editService);

    await expect(firstValueFrom(session.save())).resolves.toEqual({
      close: false,
      message: 'Time logs update failed! Can not Create TimeLog',
    });
    expect(session.timeLogs()).toEqual([created]);
  });

  it('ignores empty dialog responses and closes unchanged sessions', async () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const session = new TimeLogEditSession(buildTask([existing]), buildAdapter());
    const editService = buildEditService();

    editService.openTimeLogDialog.mockReturnValueOnce(of(undefined));
    session.edit(existing, editService);

    await expect(firstValueFrom(session.save())).resolves.toEqual({ close: true });
  });

  it('does not start a second save while the first save is active', async () => {
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const editService = buildEditService();
    const adapter = buildAdapter();
    const session = new TimeLogEditSession(buildTask(), adapter);

    editService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'update', responseData: created }));
    session.add(editService);
    const firstSave = session.save();
    const secondSave = session.save();

    await expect(firstValueFrom(firstSave)).toBeDefined();
    await expect(firstValueFrom(secondSave)).rejects.toThrow();
  });

  it('uses a generic message when save errors contain no error list', async () => {
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const editService = buildEditService();
    const adapter = {
      create: vi.fn(() => throwError(() => ({ error: {} }))),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };
    const session = new TimeLogEditSession(buildTask(), adapter);

    editService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'update', responseData: created }));
    session.add(editService);

    await expect(firstValueFrom(session.save())).resolves.toEqual({
      close: false,
      message: 'Time logs update failed!',
    });
  });
});
