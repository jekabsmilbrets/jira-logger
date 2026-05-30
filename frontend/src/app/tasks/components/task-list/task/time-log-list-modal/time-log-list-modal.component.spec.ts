import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { TableComponent } from '@shared/components/table/table.component';

import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TimeLogListModalComponent } from './time-log-list-modal.component';

describe('Tasks Components time-log-list-modal.component', () => {
  const buildTimeLog = (id: string | undefined, startIso: string): TimeLog => new TimeLog({
    id,
    startTime: new Date(startIso),
    endTime: new Date(startIso),
  });

  const setup = async () => {
    const task = new Task({ timeLogs: [] });

    const dialogRef = {
      close: vi.fn(),
    };

    const timeLogEditService = {
      openTimeLogDialog: vi.fn(() => of({ responseType: 'cancel' })),
    };

    await TestBed.configureTestingModule({
      imports: [TimeLogListModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { task } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TimeLogEditService, useValue: timeLogEditService },
      ],
    });

    const fixture = TestBed.createComponent(TimeLogListModalComponent);
    const component = fixture.componentInstance;

    return {
      fixture,
      component,
      task,
      dialogRef,
      timeLogEditService,
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('closes dialog without payload on cancel', async () => {
    const { component, dialogRef } = await setup();

    component['onCancel']();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('tracks created, updated, and deleted logs through actions', async () => {
    const { component, task } = await setup();
    const created = buildTimeLog(undefined, '2026-03-02T10:00:00.000Z');
    const existing = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    const updated = buildTimeLog('2', '2026-03-02T12:00:00.000Z');

    task.timeLogs = [existing];

    component['onCreateAction'](created);
    component['onUpdateAction'](updated);
    component['onRemoveAction'](updated);

    expect(task.timeLogs).toEqual([created]);
  });

  it('opens edit dialog and updates row when response is update', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    task.timeLogs = [current];

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: updated,
    }));

    component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);

    expect(task.timeLogs).toEqual([updated]);
  });

  it('opens edit dialog and removes row when response is delete', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('9', '2026-03-02T10:00:00.000Z');
    task.timeLogs = [current];

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'delete',
    }));

    component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);

    expect(task.timeLogs).toEqual([]);
  });

  it('ignores cancel response from edit dialog', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('11', '2026-03-02T10:00:00.000Z');
    task.timeLogs = [current];

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'cancel',
    }));

    component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);
    expect(task.timeLogs).toEqual([current]);
  });

  it('ignores undefined and update-without-data responses from edit dialog', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('11', '2026-03-02T10:00:00.000Z');
    task.timeLogs = [current];

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of(undefined) as any);
    component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);
    expect(task.timeLogs).toEqual([current]);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: undefined,
    }));
    component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);
    expect(task.timeLogs).toEqual([current]);
  });

  it('adds created/updated/deleted lists to save payload filtered by current rows', async () => {
    const { component, task, dialogRef } = await setup();
    const kept = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const removed = buildTimeLog('2', '2026-03-02T11:00:00.000Z');

    task.timeLogs = [kept, removed];

    component['onCreateAction'](buildTimeLog(undefined, '2026-03-02T09:00:00.000Z'));
    component['onUpdateAction'](buildTimeLog('1', '2026-03-02T12:00:00.000Z'));
    component['onRemoveAction'](removed);

    component['onSave']();

    const payload = dialogRef.close.mock.calls[0][0];
    expect(payload.created).toHaveLength(1);
    expect(payload.updated).toHaveLength(1);
    expect(payload.deleted).toEqual([removed]);
  });

  it('filters out created logs removed before save and skips deleted list for unsaved logs', async () => {
    const { component, task, dialogRef } = await setup();
    const createdUnsaved = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    task.timeLogs = [];

    component['onCreateAction'](createdUnsaved);
    component['onRemoveAction'](createdUnsaved);
    component['onSave']();

    const payload = dialogRef.close.mock.calls[0][0];
    expect(payload.created).toEqual([]);
    expect(payload.deleted).toEqual([]);
  });

  it('creates a new log via add button flow on update response', async () => {
    const { component, task, timeLogEditService } = await setup();
    const created = buildTimeLog('33', '2026-03-02T13:00:00.000Z');

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));

    component['onAddTimeLogClick']();

    expect(task.timeLogs).toContain(created);
  });

  it('ignores cancel/undefined/update-without-data in add button flow', async () => {
    const { component, task, timeLogEditService } = await setup();
    const initial = [...task.timeLogs];

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'cancel' }));
    component['onAddTimeLogClick']();
    expect(task.timeLogs).toEqual(initial);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of(undefined) as any);
    component['onAddTimeLogClick']();
    expect(task.timeLogs).toEqual(initial);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'update', responseData: undefined }));
    component['onAddTimeLogClick']();
    expect(task.timeLogs).toEqual(initial);
  });

  it('does not remove when time log id is not found', async () => {
    const { component, task } = await setup();
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const unknown = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    task.timeLogs = [existing];

    component['onRemoveAction'](unknown);
    expect(task.timeLogs).toEqual([existing]);
  });

  it('does not update when time log id is not found', async () => {
    const { component, task } = await setup();
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const unknown = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    task.timeLogs = [existing];

    component['onUpdateAction'](unknown);
    expect(task.timeLogs).toEqual([existing]);
  });

  it('triggers toolbar button click handlers from DOM', async () => {
    const { fixture, component } = await setup();
    (component as any).columns = [];
    const cancelSpy = vi.spyOn(component as any, 'onCancel');
    const addSpy = vi.spyOn(component as any, 'onAddTimeLogClick');
    const saveSpy = vi.spyOn(component as any, 'onSave');
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    buttons.find((btn) => btn.nativeElement.getAttribute('aria-label') === 'close dialog')?.nativeElement.click();
    buttons.find((btn) => btn.nativeElement.textContent.includes('Add Time Log'))?.nativeElement.click();
    buttons.find((btn) => btn.nativeElement.textContent.includes('Save changes'))?.nativeElement.click();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('wires shared table outputs to modal handlers', async () => {
    const { fixture, component } = await setup();
    (component as any).columns = [];
    const cellSpy = vi.spyOn(component as any, 'onCellClick');
    const removeSpy = vi.spyOn(component as any, 'onRemoveAction');
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as any;
    const timeLog = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    table.cellClicked.emit([timeLog, { columnDef: 'startTime', header: 'Start' }]);
    table.removeAction.emit(timeLog);

    expect(cellSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
