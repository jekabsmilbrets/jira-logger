import { TestBed } from '@angular/core/testing';

import { describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import { ReportColumnsService } from '@report/services/report-columns.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

describe('Report Service ReportColumnsService', () => {
  const state: ReportStateSnapshot = {
    reportMode: ReportMode.total,
    tags: [
      new Tag({ id: 'tag-1', name: 'Frontend' }),
      new Tag({ id: 'tag-2', name: 'Backend' }),
    ],
    date: null,
    startDate: null,
    endDate: null,
    showWeekends: false,
    hideUnreportedTasks: false,
  };

  it('adds tag totals before the total time logged column', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReportDateCalendarService, useValue: {} }, ReportColumnsService],
    });

    const columns = TestBed.inject(ReportColumnsService).buildColumns(state, ReportMode.total, false);
    const columnDefs = columns.map((column) => column.columnDef);

    expect(columnDefs).toContain('tagTotal_tag-1');
    expect(columnDefs.indexOf('tagTotal_tag-1')).toBeLessThan(columnDefs.indexOf('timeLogged'));
  });

  it('uses total columns when no date has been selected', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReportDateCalendarService, useValue: {} }, ReportColumnsService],
    });

    expect(TestBed.inject(ReportColumnsService).buildColumns({ ...state, tags: [] }, ReportMode.date, false)
      .map((column) => column.columnDef)).toContain('timeLogged');
  });

  it('uses total columns when a date range is incomplete', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReportDateCalendarService, useValue: {} }, ReportColumnsService],
    });

    expect(TestBed.inject(ReportColumnsService).buildColumns({
      ...state,
      startDate: new Date(0),
      endDate: null,
    }, ReportMode.dateRange, false).map((column) => column.columnDef)).toContain('timeLogged');
  });

  it('reads logged and synced columns from one Report Date Accounting result', () => {
    const date = new Date('2026-05-29T00:00:00.000Z');
    const task = new Task();
    const accountTask = vi.fn(() => ({
      timeLogged: 3600,
      timeSynced: 1800,
      isSynced: false,
    }));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ReportDateCalendarService,
          useValue: {
            datesInRange: vi.fn(() => [date]),
            formatColumnHeader: vi.fn(() => '29. May'),
            accountTask,
          },
        },
        ReportColumnsService,
      ],
    });

    const columns = TestBed.inject(ReportColumnsService).buildColumns({
      ...state,
      tags: [],
      date,
    }, ReportMode.date, true);
    const loggedColumn = columns.find((column) => column.columnDef === `date-${ date.getTime() }`);
    const syncedColumn = columns.find((column) => column.columnDef === 'synced');

    expect(loggedColumn?.cell(task)).toBe(3600);
    expect(syncedColumn?.cell(task)).toBe(1800);
    expect(accountTask).toHaveBeenCalledWith(task, date);
  });
});
