import { Clipboard } from '@angular/cdk/clipboard';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import type { JiraWorkLogSyncOutcome } from '@tasks/interfaces/jira-work-log-sync-outcome.interface';
import { JiraWorkLogSyncService } from '@tasks/services/jira-work-log-sync.service';

import { reportBaseColumns } from '@report/constants/report-base-columns.constant';
import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { ReportViewComponent } from './report-view.component';

describe('ReportViewComponent', () => {
  let fixture: ComponentFixture<ReportViewComponent>;
  let component: ReportViewComponent;
  let reportService: ReportServiceStub;
  let clipboard: { copy: ReturnType<typeof vi.fn> };
  let jiraWorkLogSyncService: {
    syncReportDate: ReturnType<typeof vi.fn>;
  };
  let matSnackBar: { open: ReturnType<typeof vi.fn> };
  let reportDateCalendarService: {
    isTaskSyncedForReportDate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    clipboard = { copy: vi.fn() };
    jiraWorkLogSyncService = {
      syncReportDate: vi.fn(() => of({
        reloadReport: true,
        message: 'Task synced',
        duration: 5000,
      } satisfies JiraWorkLogSyncOutcome)),
    };
    matSnackBar = { open: vi.fn() };
    reportDateCalendarService = { isTaskSyncedForReportDate: vi.fn(() => false) };
    reportService = new ReportServiceStub({
      settingsControlsState: {
        reportMode: ReportMode.date,
      },
      viewState: {
        columns: reportBaseColumns,
        tasks: [new Task({
          name: 'Task With Tags',
          description: 'Desc',
          tags: [
            new Tag({ name: 'Alpha' }),
            new Tag({ name: 'Beta' }),
          ],
        })],
      },
      reload: vi.fn(),
    });

    await TestBed.configureTestingModule({
      imports: [ReportViewComponent],
      providers: [
        { provide: Clipboard, useValue: clipboard },
        { provide: JiraWorkLogSyncService, useValue: jiraWorkLogSyncService },
        { provide: MatSnackBar, useValue: matSnackBar },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarService },
        { provide: ReportService, useValue: reportService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportViewComponent);
    component = fixture.componentInstance;
  });

  it('binds table inputs and wires table outputs through template', () => {
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(TableComponent));
    expect(table).toBeTruthy();
    expect(table.componentInstance.enableFooter()).toBe(true);
    expect(table.componentInstance.isSelectable()).toBe(false);

    const onCellClickSpy = vi.spyOn(component as any, 'onCellClick');
    const onFooterClickSpy = vi.spyOn(component as any, 'onFooterCellClicked');
    const onSyncClickSpy = vi.spyOn(component as any, 'onSyncClick');
    const sampleTask = { name: 'Task X', isTimeLogRunning: false } as Task;
    const sampleColumn = { columnDef: 'name', header: 'Name', cell: () => 'X' } as Column;

    table.componentInstance.cellClicked.emit([sampleTask, sampleColumn]);
    table.componentInstance.footerCellClicked.emit([[sampleTask], sampleColumn]);
    table.componentInstance.rowAction.emit([sampleTask, 'sync']);

    expect(onCellClickSpy).toHaveBeenCalled();
    expect(onFooterClickSpy).toHaveBeenCalled();
    expect(onSyncClickSpy).toHaveBeenCalledWith(sampleTask);
  });

  it('renders visible tag text in the report table', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Alpha,Beta');
  });

  it('uses effective report mode for sync row action visibility', () => {
    reportService.setViewState({
      reportDate: null,
      canSyncJiraWorkLogs: false,
    });

    expect((component as any).rowActions()).toEqual([]);

    reportService.setViewState({
      reportDate: new Date('2026-05-30T00:00:00.000Z'),
      canSyncJiraWorkLogs: true,
    });

    expect((component as any).rowActions()).toEqual([
      expect.objectContaining({
        id: 'sync',
      }),
    ]);
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
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Copied Task "Task A" logged time to clipboard "1h 1m"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies footer interactions', () => {
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'name',
      header: 'Name',
      cell: (task: Task) => task.name,
    } as Column;

    (component as any).onFooterCellClicked([rows as Searchable[], column]);

    expect(clipboard.copy).toHaveBeenCalledWith('A, B');
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Copied field "Name" value to clipboard "A, B"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('syncs report date rows and reloads report when Jira-facing data changed', () => {
    const task = { name: 'Task C', isTimeLogRunning: false } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportService.setViewState({
      reportDate: date,
      canSyncJiraWorkLogs: true,
    });

    (component as any).onSyncClick(task as Searchable);

    expect(jiraWorkLogSyncService.syncReportDate).toHaveBeenCalledWith(task, date);
    expect(reportService.reload).toHaveBeenCalledOnce();
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Task synced',
      undefined,
      { duration: 5000 },
    );
  });

  it('does nothing when syncing without a selected date', () => {
    const task = { name: 'Task G', isTimeLogRunning: false } as Task;
    reportService.setViewState({
      reportDate: null,
      canSyncJiraWorkLogs: true,
    });

    (component as any).onSyncClick(task as Searchable);

    expect(jiraWorkLogSyncService.syncReportDate).not.toHaveBeenCalled();
  });

  it('disables synced row actions through the report date calendar', () => {
    const task = { name: 'Task H' } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportDateCalendarService.isTaskSyncedForReportDate.mockReturnValueOnce(true);
    reportService.setViewState({
      reportDate: date,
      canSyncJiraWorkLogs: true,
    });

    const [syncAction] = (component as any).rowActions();

    expect(syncAction.isDisabled(task)).toBe(true);
    expect(reportDateCalendarService.isTaskSyncedForReportDate).toHaveBeenCalledWith(task, date);
  });
});
