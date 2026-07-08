import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TableComponent } from '@shared/components/table/table.component';
import type { Column } from '@shared/interfaces/column.interface';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { reportBaseColumns } from '@report/constants/report-base-columns.constant';
import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { ReportInteractionService } from '@report/services/report-interaction.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

import { ReportViewComponent } from './report-view.component';

describe('ReportViewComponent', () => {
  let fixture: ComponentFixture<ReportViewComponent>;
  let component: ReportViewComponent;
  let reportService: ReportServiceStub;

  let reportInteractionService: {
    copyCell: ReturnType<typeof vi.fn>;
    copyFooter: ReturnType<typeof vi.fn>;
    syncJiraWorkLog: ReturnType<typeof vi.fn>;
    isJiraWorkLogSynced: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    reportInteractionService = {
      copyCell: vi.fn(),
      copyFooter: vi.fn(),
      syncJiraWorkLog: vi.fn(() => of(undefined)),
      isJiraWorkLogSynced: vi.fn(() => false),
    };
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
        { provide: ReportService, useValue: reportService },
        { provide: ReportInteractionService, useValue: reportInteractionService },
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

  it('delegates cell copy interactions', () => {
    const task = { name: 'Task A' } as Task;
    const column = {
      columnDef: 'timeLogged',
      header: 'Time Logged',
      cellClickType: 'readableTime',
      cell: () => 3660,
    } as Column;

    (component as any).onCellClick([task as Searchable, column]);

    expect(reportInteractionService.copyCell).toHaveBeenCalledWith(task, column);
  });

  it('delegates footer copy interactions', () => {
    const rows = [{ name: 'A' }, { name: 'B' }] as Task[];
    const column = {
      columnDef: 'name',
      header: 'Name',
      cell: (task: Task) => task.name,
    } as Column;

    (component as any).onFooterCellClicked([rows as Searchable[], column]);

    expect(reportInteractionService.copyFooter).toHaveBeenCalledWith(rows, column);
  });

  it('delegates report date sync interactions', () => {
    const task = { name: 'Task C', isTimeLogRunning: false } as Task;
    const date = new Date('2026-05-30T00:00:00.000Z');
    reportService.setViewState({
      reportDate: date,
      canSyncJiraWorkLogs: true,
    });

    (component as any).onSyncClick(task as Searchable);

    expect(reportInteractionService.syncJiraWorkLog).toHaveBeenCalledWith(task, date);
  });

  it('does nothing when syncing without a selected date', () => {
    const task = { name: 'Task G', isTimeLogRunning: false } as Task;
    reportService.setViewState({
      reportDate: null,
      canSyncJiraWorkLogs: true,
    });

    (component as any).onSyncClick(task as Searchable);

    expect(reportInteractionService.syncJiraWorkLog).not.toHaveBeenCalled();
  });
});
