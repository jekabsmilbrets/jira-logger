import { Clipboard } from '@angular/cdk/clipboard';
import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { ReportViewComponent } from './report-view.component';

describe('ReportViewComponent', () => {
  let fixture: ComponentFixture<ReportViewComponent>;
  let component: ReportViewComponent;
  let reportService: ReportServiceStub;

  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let tasksService: { syncDateToJiraApi: ReturnType<typeof vi.fn> };
  let timeLogsService: { stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    clipboard = { copy: vi.fn() };
    snackBar = { open: vi.fn() };
    tasksService = { syncDateToJiraApi: vi.fn().mockReturnValue(of(true)) };
    timeLogsService = {
      stop: vi.fn().mockReturnValue(of(undefined)),
      start: vi.fn().mockReturnValue(of(true)),
    };
    reportService = new ReportServiceStub({
      reportMode: ReportMode.date,
      columns: [{
        columnDef: 'sync',
        header: 'Sync',
        cell: () => undefined,
      } as Column],
      reload: vi.fn(),
    });

    await TestBed.configureTestingModule({
      imports: [ReportViewComponent],
      providers: [
        { provide: ReportService, useValue: reportService },
        { provide: TasksService, useValue: tasksService },
        { provide: TimeLogsService, useValue: timeLogsService },
        { provide: Clipboard, useValue: clipboard },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportViewComponent);
    component = fixture.componentInstance;
    (component as any).ReportMode = ReportMode;
  });

  it('binds table inputs and wires table outputs through template', () => {
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(TableComponent));
    expect(table).toBeTruthy();
    expect(table.componentInstance.enableFooter()).toBe(true);
    expect(table.componentInstance.isSelectable()).toBe(false);

    const onCellClickSpy = vi.spyOn(component as any, 'onCellClick');
    const onFooterClickSpy = vi.spyOn(component as any, 'onFooterCellClicked');
    const onSyncSpy = vi.spyOn(component as any, 'onSyncClick');
    const sampleTask = { name: 'Task X', isTimeLogRunning: false } as Task;
    const sampleColumn = { columnDef: 'name', header: 'Name', cell: () => 'X' } as Column;

    table.componentInstance.cellClicked.emit([sampleTask, sampleColumn]);
    table.componentInstance.footerCellClicked.emit([[sampleTask], sampleColumn]);
    table.componentInstance.syncAction.emit(sampleTask);

    expect(onCellClickSpy).toHaveBeenCalled();
    expect(onFooterClickSpy).toHaveBeenCalled();
    expect(onSyncSpy).toHaveBeenCalled();
  });

  it('copies readable-time cell value and shows snackbar', () => {
    const task = { name: 'Task A' } as Task;
    const column = {
      columnDef: 'timeLogged',
      header: 'Time Logged',
      cellClickType: 'readableTime',
      cell: () => 3660,
    } as Column;

    (component as any).onCellClick([task as Searchable, column]);

    expect(clipboard.copy).toHaveBeenCalledWith('1h 1m');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Copied Task "Task A" logged time to clipboard "1h 1m"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies string cell value and shows snackbar', () => {
    const task = { name: 'Task B' } as Task;
    const column = {
      columnDef: 'name',
      header: 'Name',
      cellClickType: 'string',
      cell: () => 'Alpha',
    } as Column;

    (component as any).onCellClick([task as Searchable, column]);

    expect(clipboard.copy).toHaveBeenCalledWith('Alpha');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Copied Task "Task B" field "Name" value to clipboard "Alpha"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies concatenated footer values and shows snackbar', () => {
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'name',
      header: 'Name',
      cell: (task: Task) => task.name,
    } as Column;

    (component as any).onFooterCellClicked([rows as Searchable[], column]);

    expect(clipboard.copy).toHaveBeenCalledWith('A, B');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Copied field "Name" value to clipboard "A, B"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies concatenatedString footer value and shows snackbar', () => {
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'name',
      header: 'Name',
      footerCellClickType: 'concatenatedString',
      cell: (task: Task) => task.name,
    } as Column;

    (component as any).onFooterCellClicked([rows as Searchable[], column]);

    expect(clipboard.copy).toHaveBeenCalledWith('A, B');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Copied field "Name" value to clipboard "A, B"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies readableTime footer value and shows snackbar', () => {
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'timeLogged',
      header: 'Time Logged',
      footerCellClickType: 'readableTime',
      cell: () => 0,
      footerCell: () => 3661,
    } as Column;

    (component as any).onFooterCellClicked([rows as Searchable[], column]);

    expect(clipboard.copy).toHaveBeenCalledWith('1h 1m');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Copied logged time to clipboard "1h 1m"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('syncs non-running task and reloads report on success', () => {
    const task = { name: 'Task C', isTimeLogRunning: false } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportService.setDate(date);

    (component as any).onSyncClick(task as Searchable);

    expect(tasksService.syncDateToJiraApi).toHaveBeenCalledWith(task, date);
    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
    expect(reportService.reload).toHaveBeenCalledTimes(1);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Task "Task C" synced successfully!',
      undefined,
      { duration: 5000 },
    );
  });

  it('stops and restarts running task around sync flow', () => {
    const task = { name: 'Task D', isTimeLogRunning: true } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportService.setDate(date);

    (component as any).onSyncClick(task as Searchable);

    expect(timeLogsService.stop).toHaveBeenCalledWith(task);
    expect(tasksService.syncDateToJiraApi).toHaveBeenCalledWith(task, date);
    expect(timeLogsService.start).toHaveBeenCalledWith(task);
  });

  it('continues sync when stop fails for running task', () => {
    timeLogsService.stop.mockReturnValueOnce(throwError(() => new Error('stop failed')));
    const task = { name: 'Task E', isTimeLogRunning: true } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportService.setDate(date);

    (component as any).onSyncClick(task as Searchable);

    expect(tasksService.syncDateToJiraApi).toHaveBeenCalledWith(task, date);
    expect(timeLogsService.start).toHaveBeenCalledWith(task);
  });

  it('reports sync failure details from HttpErrorResponse', () => {
    const error = new HttpErrorResponse({
      error: {
        errors: ['Bad transition', 'Time log missing'],
      },
    });
    tasksService.syncDateToJiraApi.mockReturnValueOnce(throwError(() => error));
    const task = { name: 'Task F', isTimeLogRunning: false } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportService.setDate(date);

    (component as any).onSyncClick(task as Searchable);

    expect(snackBar.open).toHaveBeenCalledWith(
      'Task "Task F" failed synced! Bad transition, Time log missing',
      undefined,
      { duration: 5000 },
    );
    expect(reportService.reload).not.toHaveBeenCalled();
  });

  it('does nothing when syncing without a selected date', () => {
    const task = { name: 'Task G', isTimeLogRunning: false } as Task;
    reportService.setDate(null);

    (component as any).onSyncClick(task as Searchable);

    expect(tasksService.syncDateToJiraApi).not.toHaveBeenCalled();
    expect(timeLogsService.stop).not.toHaveBeenCalled();
    expect(timeLogsService.start).not.toHaveBeenCalled();
  });
});
