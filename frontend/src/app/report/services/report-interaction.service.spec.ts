import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { firstValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Column } from '@shared/interfaces/column.interface';
import { Task } from '@shared/models/task.model';

import type { JiraWorkLogSyncOutcome } from '@tasks/interfaces/jira-work-log-sync-outcome.interface';
import { JiraWorkLogSyncService } from '@tasks/services/jira-work-log-sync.service';

import { ReportService } from '@report/services/report.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';
import { ReportInteractionService } from '@report/services/report-interaction.service';

describe('ReportInteractionService', () => {
  const setup = () => {
    const clipboard = { copy: vi.fn() };
    const jiraWorkLogSyncService = {
      syncReportDate: vi.fn<(
        task: Task,
        date: Date,
      ) => ReturnType<JiraWorkLogSyncService['syncReportDate']>>(() => of({
        reloadReport: true,
        message: 'Task synced',
        duration: 5000,
      } satisfies JiraWorkLogSyncOutcome)),
    };
    const matSnackBar = { open: vi.fn() };
    const reportDateCalendarService = {
      isTaskSyncedForReportDate: vi.fn(() => false),
    };
    const reportService = { reload: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ReportInteractionService,
        { provide: Clipboard, useValue: clipboard },
        { provide: JiraWorkLogSyncService, useValue: jiraWorkLogSyncService },
        { provide: MatSnackBar, useValue: matSnackBar },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarService },
        { provide: ReportService, useValue: reportService },
      ],
    });

    return {
      clipboard,
      jiraWorkLogSyncService,
      matSnackBar,
      reportDateCalendarService,
      reportService,
      service: TestBed.inject(ReportInteractionService),
    };
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('copies readable-time cell value and shows snackbar', () => {
    const { clipboard, matSnackBar, service } = setup();
    const task = { name: 'Task A' } as Task;
    const column = {
      columnDef: 'timeLogged',
      header: 'Time Logged',
      cellClickType: 'readableTime',
      cell: () => 3660,
    } as Column;

    service.copyCell(task, column);

    expect(clipboard.copy).toHaveBeenCalledWith('1h 1m');
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Copied Task "Task A" logged time to clipboard "1h 1m"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies string cell value and shows snackbar', () => {
    const { clipboard, matSnackBar, service } = setup();
    const task = { name: 'Task B' } as Task;
    const column = {
      columnDef: 'name',
      header: 'Name',
      cellClickType: 'string',
      cell: () => 'Alpha',
    } as Column;

    service.copyCell(task, column);

    expect(clipboard.copy).toHaveBeenCalledWith('Alpha');
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Copied Task "Task B" field "Name" value to clipboard "Alpha"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies concatenated footer values and shows snackbar', () => {
    const { clipboard, matSnackBar, service } = setup();
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'name',
      header: 'Name',
      cell: (task: Task) => task.name,
    } as Column;

    service.copyFooter(rows, column);

    expect(clipboard.copy).toHaveBeenCalledWith('A, B');
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Copied field "Name" value to clipboard "A, B"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('copies readableTime footer value and shows snackbar', () => {
    const { clipboard, matSnackBar, service } = setup();
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'timeLogged',
      header: 'Time Logged',
      footerCellClickType: 'readableTime',
      cell: () => 0,
      footerCell: () => 3661,
    } as Column;

    service.copyFooter(rows, column);

    expect(clipboard.copy).toHaveBeenCalledWith('1h 1m');
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Copied logged time to clipboard "1h 1m"!',
      undefined,
      { duration: 5000 },
    );
  });

  it('syncs Jira Work Log and reloads report when Jira-facing data changed', async () => {
    const { jiraWorkLogSyncService, matSnackBar, reportService, service } = setup();
    const task = { name: 'Task C' } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');

    await firstValueFrom(service.syncJiraWorkLog(task, date));

    expect(jiraWorkLogSyncService.syncReportDate).toHaveBeenCalledWith(task, date);
    expect(reportService.reload).toHaveBeenCalledOnce();
    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Task synced',
      undefined,
      { duration: 5000 },
    );
  });

  it('keeps partial sync snackbar open', async () => {
    const { jiraWorkLogSyncService, matSnackBar, reportService, service } = setup();
    jiraWorkLogSyncService.syncReportDate.mockReturnValueOnce(of({
      reloadReport: true,
      message: 'Synced to Jira, but Work Log could not be continued.',
      duration: null,
    }));

    await firstValueFrom(service.syncJiraWorkLog({ name: 'Task D' } as Task, new Date()));

    expect(matSnackBar.open).toHaveBeenCalledWith(
      'Synced to Jira, but Work Log could not be continued.',
      undefined,
      { duration: undefined },
    );
    expect(reportService.reload).toHaveBeenCalledOnce();
  });

  it('does not reload report when Jira-facing data did not change', async () => {
    const { jiraWorkLogSyncService, reportService, service } = setup();
    jiraWorkLogSyncService.syncReportDate.mockReturnValueOnce(of({
      reloadReport: false,
      message: 'Task failed',
      duration: 5000,
    }));

    await firstValueFrom(service.syncJiraWorkLog({ name: 'Task E' } as Task, new Date()));

    expect(reportService.reload).not.toHaveBeenCalled();
  });

  it('checks Jira Work Log sync state through report date calendar', () => {
    const { reportDateCalendarService, service } = setup();
    const task = { name: 'Task F' } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');

    service.isJiraWorkLogSynced(task, date);

    expect(reportDateCalendarService.isTaskSyncedForReportDate).toHaveBeenCalledWith(task, date);
  });
});
