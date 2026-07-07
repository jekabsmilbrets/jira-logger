import { firstValueFrom, of, throwError } from 'rxjs';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import type { TimeLogEditService } from '@tasks/services/time-log-edit.service';
import { TimeLogEditSession } from '@tasks/services/time-log-edit-session';

describe('TimeLogEditSession', () => {
  const buildTimeLog = (id: string | undefined, startIso: string): TimeLog => new TimeLog({
    id,
    startTime: new Date(startIso),
    endTime: new Date(startIso),
  });

  const buildEditService = () => ({
    openTimeLogDialog: vi.fn(() => of({ responseType: 'cancel' })),
  }) as unknown as TimeLogEditService & {
    openTimeLogDialog: ReturnType<typeof vi.fn>;
  };

  it('applies edit dialog updates, deletes, and ignored responses inside the session', () => {
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    const session = new TimeLogEditSession([existing]);
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
    const session = new TimeLogEditSession([]);
    const editService = buildEditService();

    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));
    session.add(editService);

    expect(session.timeLogs()).toEqual([created]);
  });

  it('saves created, updated, and deleted Time Logs and returns a close response', async () => {
    const task = new Task({ id: 'task-1', timeLogs: [] } as any);
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const removed = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T12:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const persistedCreated = buildTimeLog('created-id', '2026-03-02T09:00:00.000Z');
    const session = new TimeLogEditSession([existing, removed]);
    const editService = buildEditService();
    const timeLogsAdapter = {
      create: vi.fn(() => of(persistedCreated)),
      update: vi.fn(() => of(updated)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of([persistedCreated, updated])),
    };

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

    await expect(firstValueFrom(session.save(task, timeLogsAdapter))).resolves.toEqual({
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
    const task = new Task({ id: 'task-1', timeLogs: [] } as any);
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const session = new TimeLogEditSession([]);
    const editService = buildEditService();
    const timeLogsAdapter = {
      create: vi.fn(() => throwError(() => ({ error: { errors: ['Can not Create TimeLog'] } }))),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    editService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));
    session.add(editService);

    await expect(firstValueFrom(session.save(task, timeLogsAdapter))).resolves.toEqual({
      close: false,
      message: 'Time logs update failed! Can not Create TimeLog',
    });
    expect(session.timeLogs()).toEqual([created]);
  });
});
