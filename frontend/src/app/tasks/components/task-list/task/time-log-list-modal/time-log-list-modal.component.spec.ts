import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleService } from '@core/services/locale.service';
import { TimezoneService } from '@core/services/timezone.service';

import { TableComponent } from '@shared/components/table/table.component';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { TimeLogListModalComponent } from './time-log-list-modal.component';

describe('Tasks Components time-log-list-modal.component', () => {
  const buildTimeLog = (id: string | undefined, startIso: string): TimeLog => new TimeLog({
    id,
    startTime: new Date(startIso),
    endTime: new Date(startIso),
  });

  const setComponentTimeLogs = (
    component: TimeLogListModalComponent,
    task: Task,
    timeLogs: TimeLog[],
  ): void => {
    task.timeLogs = timeLogs;
    component['transaction'].reset(timeLogs);
  };

  const setup = async () => {
    const task = new Task({ timeLogs: [] });

    const dialogRef = {
      close: vi.fn(),
    };

    const timeLogEditService = {
      openTimeLogDialog: vi.fn(() => of({ responseType: 'cancel' })),
    };
    const timeLogsService = {
      create: vi.fn((_: Task, timeLog: TimeLog) => of(new TimeLog({ ...timeLog, id: timeLog.id ?? 'created-id' }))),
      update: vi.fn((_: Task, timeLog: TimeLog) => of(timeLog)),
      delete: vi.fn(() => of(undefined)),
      list: vi.fn(() => of(task.timeLogs)),
    };
    const snackBar = {
      open: vi.fn(),
    };
    const timezoneService = {
      timezone: 'Europe/Vienna',
    };
    const localeService = {
      locale: 'lv-LV',
    };

    await TestBed.configureTestingModule({
      imports: [TimeLogListModalComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { task } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: TimeLogEditService, useValue: timeLogEditService },
        { provide: TimeLogsService, useValue: timeLogsService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TimezoneService, useValue: timezoneService },
        { provide: LocaleService, useValue: localeService },
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
      timeLogsService,
      snackBar,
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

    setComponentTimeLogs(component, task, [existing]);

    component['onCreateAction'](created);
    component['onUpdateAction'](existing, updated);
    component['onRemoveAction'](updated);

    expect(component['timeLogs']()).toEqual([created]);
  });

  it('opens edit dialog and updates row when response is update', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T11:00:00.000Z');
    setComponentTimeLogs(component, task, [current]);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: updated,
    }));

    await component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);

    expect(component['timeLogs']()).toEqual([updated]);
  });

  it('opens edit dialog and removes row when response is delete', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('9', '2026-03-02T10:00:00.000Z');
    setComponentTimeLogs(component, task, [current]);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'delete',
    }));

    await component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);

    expect(component['timeLogs']()).toEqual([]);
  });

  it('ignores cancel response from edit dialog', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('11', '2026-03-02T10:00:00.000Z');
    setComponentTimeLogs(component, task, [current]);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'cancel',
    }));

    await component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);
    expect(component['timeLogs']()).toEqual([current]);
  });

  it('ignores undefined and update-without-data responses from edit dialog', async () => {
    const { component, task, timeLogEditService } = await setup();
    const current = buildTimeLog('11', '2026-03-02T10:00:00.000Z');
    setComponentTimeLogs(component, task, [current]);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of(undefined) as any);
    await component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);
    expect(component['timeLogs']()).toEqual([current]);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: undefined,
    }));
    await component['onCellClick']([current, { columnDef: 'startTime', header: 'Start' } as any]);
    expect(component['timeLogs']()).toEqual([current]);
  });

  it('saves staged changes, refreshes rows, and closes the modal', async () => {
    const { component, task, dialogRef, timeLogsService } = await setup();
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const removed = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    const updated = buildTimeLog('1', '2026-03-02T12:00:00.000Z');
    const created = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    const persistedCreated = buildTimeLog('created-id', '2026-03-02T09:00:00.000Z');

    setComponentTimeLogs(component, task, [existing, removed]);
    timeLogsService.create.mockReturnValueOnce(of(persistedCreated));
    timeLogsService.list.mockReturnValueOnce(of([persistedCreated, updated]));

    component['onCreateAction'](created);
    component['onUpdateAction'](existing, updated);
    component['onRemoveAction'](removed);
    component['onSave']();

    expect(timeLogsService.create).toHaveBeenCalledWith(task, created);
    expect(timeLogsService.update).toHaveBeenCalledWith(task, updated);
    expect(timeLogsService.delete).toHaveBeenCalledWith(task, removed);
    expect(component['timeLogs']()).toEqual([persistedCreated, updated]);
    expect(dialogRef.close).toHaveBeenCalledWith({ saved: true, timeLogs: [persistedCreated, updated] });
  });

  it('keeps the modal open when save fails', async () => {
    const { component, task, dialogRef, timeLogsService } = await setup();
    const createdUnsaved = buildTimeLog(undefined, '2026-03-02T09:00:00.000Z');
    timeLogsService.create.mockReturnValueOnce(throwError(() => ({
      error: { errors: ['Can not Create TimeLog'] },
    })));

    component['onCreateAction'](createdUnsaved);
    component['onSave']();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component['timeLogs']()).toEqual([createdUnsaved]);
  });

  it('treats an empty refreshed list as a successful save after deleting all logs', async () => {
    const { component, task, dialogRef, timeLogsService } = await setup();
    const first = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const second = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    setComponentTimeLogs(component, task, [first, second]);
    timeLogsService.list.mockReturnValueOnce(of([]));

    component['onRemoveAction'](first);
    component['onRemoveAction'](second);
    component['onSave']();

    expect(timeLogsService.delete).toHaveBeenCalledWith(task, first);
    expect(timeLogsService.delete).toHaveBeenCalledWith(task, second);
    expect(component['timeLogs']()).toEqual([]);
    expect(dialogRef.close).toHaveBeenCalledWith({ saved: true, timeLogs: [] });
  });

  it('creates a new log via add button flow on update response', async () => {
    const { component, task, timeLogEditService } = await setup();
    const created = buildTimeLog('33', '2026-03-02T13:00:00.000Z');

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({
      responseType: 'update',
      responseData: created,
    }));

    await component['onAddTimeLogClick']();

    expect(component['timeLogs']()).toContain(created);
  });

  it('ignores cancel/undefined/update-without-data in add button flow', async () => {
    const { component, task, timeLogEditService } = await setup();
    const initial = [...component['timeLogs']()];

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'cancel' }));
    await component['onAddTimeLogClick']();
    expect(component['timeLogs']()).toEqual(initial);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of(undefined) as any);
    await component['onAddTimeLogClick']();
    expect(component['timeLogs']()).toEqual(initial);

    timeLogEditService.openTimeLogDialog.mockReturnValueOnce(of({ responseType: 'update', responseData: undefined }));
    await component['onAddTimeLogClick']();
    expect(component['timeLogs']()).toEqual(initial);
  });

  it('reuses the cached time-log-edit service promise', async () => {
    const { component, timeLogEditService } = await setup();

    const first = component['loadTimeLogEditService']();
    const second = component['loadTimeLogEditService']();

    const [firstService, secondService] = await Promise.all([first, second]);
    expect(firstService).toBe(secondService);
    expect(firstService).toBe(timeLogEditService);
  });

  it('does not remove when time log id is not found', async () => {
    const { component, task } = await setup();
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const unknown = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    setComponentTimeLogs(component, task, [existing]);

    component['onRemoveAction'](unknown);
    expect(component['timeLogs']()).toEqual([existing]);
  });

  it('does not update when time log id is not found', async () => {
    const { component, task } = await setup();
    const existing = buildTimeLog('1', '2026-03-02T10:00:00.000Z');
    const unknown = buildTimeLog('2', '2026-03-02T11:00:00.000Z');
    setComponentTimeLogs(component, task, [existing]);

    component['onUpdateAction'](unknown, buildTimeLog('2', '2026-03-02T12:00:00.000Z'));
    expect(component['timeLogs']()).toEqual([existing]);
  });

  it('formats rows using the saved timezone instead of browser local time', async () => {
    const { component } = await setup();
    const timeLog = new TimeLog({
      startTime: new Date('2026-06-02T22:00:00.000Z'),
      endTime: new Date('2026-06-03T21:59:00.000Z'),
    });

    const startColumn = component['columns'].find((column) => column.columnDef === 'startTime');
    const endColumn = component['columns'].find((column) => column.columnDef === 'endTime');

    expect(startColumn?.cell(timeLog)).toBe('2026-06-03 0:00:0');
    expect(endColumn?.cell(timeLog)).toBe('2026-06-03 23:59:0');
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
    await addSpy.mock.results[0]?.value;

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
    await cellSpy.mock.results[0]?.value;

    expect(cellSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
