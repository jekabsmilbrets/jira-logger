import { TestBed } from '@angular/core/testing';

import { Locale } from '@core/services/locale';
import { Timezone } from '@core/services/timezone';

import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { ReportDateCalendar } from './report-date-calendar';

describe('Report Service ReportDateCalendar', () => {
  let service: ReportDateCalendar;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));

    TestBed.configureTestingModule({
      providers: [
        ReportDateCalendar,
        { provide: Locale, useValue: { locale: 'en-US' } },
        { provide: Timezone, useValue: { timezone: 'UTC' } },
      ],
    });

    service = TestBed.inject(ReportDateCalendar);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('builds today report route link', () => {
    expect(service.todayRouteLink()).toBe('/report/date/2026-05-29');
  });

  it('returns today as a Report Date', () => {
    expect(service.todayReportDate().toISOString()).toBe('2026-05-29T00:00:00.000Z');
  });

  it('parses valid route dates and rejects invalid route dates', () => {
    expect(service.parseRouteDate('2026-05-29')?.toISOString()).toBe('2026-05-29T00:00:00.000Z');
    expect(service.parseRouteDate('2026-02-31')).toBeNull();
    expect(service.parseRouteDate('2026-05-29T12:00:00.000Z')).toBeNull();
    expect(service.parseRouteDate(null)).toBeNull();
  });

  it('formats request dates', () => {
    const date = new Date('2026-05-29T22:15:00.000Z');

    expect(service.formatRequestDate(date)).toBe('2026-05-29');
  });

  it('builds inclusive report date ranges', () => {
    const dates = service.datesInRange(
      new Date('2026-05-29T00:00:00.000Z'),
      new Date('2026-05-31T00:00:00.000Z'),
    );

    expect(dates.map((date: Date) => date.toISOString())).toEqual([
      '2026-05-29T00:00:00.000Z',
      '2026-05-30T00:00:00.000Z',
      '2026-05-31T00:00:00.000Z',
    ]);
  });

  it('detects weekends', () => {
    expect(service.isWeekend(new Date('2026-05-30T00:00:00.000Z'))).toBe(true);
    expect(service.isWeekend(new Date('2026-05-29T00:00:00.000Z'))).toBe(false);
  });

  it('returns start of report date in active timezone', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReportDateCalendar,
        { provide: Locale, useValue: { locale: 'en-US' } },
        { provide: Timezone, useValue: { timezone: 'Europe/Riga' } },
      ],
    });

    const rigaService = TestBed.inject(ReportDateCalendar);

    expect(rigaService.startOfReportDate(new Date('2026-05-29T12:00:00.000Z')).toISOString()).toBe('2026-05-28T21:00:00.000Z');
  });

  it('returns end of report date in active timezone', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReportDateCalendar,
        { provide: Locale, useValue: { locale: 'en-US' } },
        { provide: Timezone, useValue: { timezone: 'Europe/Riga' } },
      ],
    });

    const rigaService = TestBed.inject(ReportDateCalendar);

    expect(rigaService.endOfReportDate(new Date('2026-05-29T12:00:00.000Z')).toISOString()).toBe('2026-05-29T20:59:59.999Z');
  });

  it('accounts for logged time, synced time, and sync state as one result', () => {
    const task = new Task({
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-05-29T10:00:00.000Z'),
          endTime: new Date('2026-05-29T11:00:00.000Z'),
        }),
      ],
      jiraWorkLogs: [
        new JiraWorkLog({
          startTime: new Date('2026-05-29T00:00:00.000Z'),
          timeSpentSeconds: 3600,
        }),
      ],
    });

    expect(service.accountTask(task, new Date('2026-05-29T12:00:00.000Z'))).toEqual({
      timeLogged: 3600,
      timeSynced: 3600,
      isSynced: true,
    });
  });

  it('does not treat zero logged and zero synced time as synced', () => {
    expect(service.accountTask(
      new Task(),
      new Date('2026-05-29T12:00:00.000Z'),
    )).toEqual({
      timeLogged: 0,
      timeSynced: 0,
      isSynced: false,
    });
  });

  it('accounts only for the Time Log overlap with the selected Report Date', () => {
    const task = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2026-05-28T23:30:00.000Z'),
        endTime: new Date('2026-05-29T00:30:00.000Z'),
      })],
    });

    expect(service.accountTask(
      task,
      new Date('2026-05-29T12:00:00.000Z'),
    ).timeLogged).toBe(30 * 60);
  });

  it('filters visible Report Dates and formats column headers through the calendar interface', () => {
    const visibleDates = service.visibleDatesInRange(
      new Date('2026-05-29T00:00:00.000Z'),
      new Date('2026-05-31T00:00:00.000Z'),
      false,
    );

    expect(visibleDates.map((date: Date) => date.toISOString())).toEqual([
      '2026-05-29T00:00:00.000Z',
    ]);
    expect(service.formatColumnHeader(new Date('2026-05-29T00:00:00.000Z'))).toBe('29. May');
  });

  it('checks sync against the selected Report Date instead of all logged time', () => {
    const task = new Task({
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-05-28T10:00:00.000Z'),
          endTime: new Date('2026-05-28T11:00:00.000Z'),
        }),
        new TimeLog({
          startTime: new Date('2026-05-29T10:00:00.000Z'),
          endTime: new Date('2026-05-29T11:00:00.000Z'),
        }),
      ],
      jiraWorkLogs: [
        new JiraWorkLog({
          startTime: new Date('2026-05-29T00:00:00.000Z'),
          timeSpentSeconds: 3600,
        }),
      ],
    });

    expect(service.accountTask(task, new Date('2026-05-29T12:00:00.000Z')).isSynced).toBe(true);
  });

  it('accounts for short and long Report Dates across daylight-saving transitions', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReportDateCalendar,
        { provide: Locale, useValue: { locale: 'en-US' } },
        { provide: Timezone, useValue: { timezone: 'Europe/Riga' } },
      ],
    });

    const rigaService = TestBed.inject(ReportDateCalendar);
    const shortDayTask = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2026-03-28T22:00:00.000Z'),
        endTime: new Date('2026-03-29T21:00:00.000Z'),
      })],
    });
    const longDayTask = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2026-10-24T21:00:00.000Z'),
        endTime: new Date('2026-10-25T22:00:00.000Z'),
      })],
    });

    expect(rigaService.accountTask(
      shortDayTask,
      new Date('2026-03-29T12:00:00.000Z'),
    ).timeLogged).toBe(23 * 60 * 60);
    expect(rigaService.accountTask(
      longDayTask,
      new Date('2026-10-25T12:00:00.000Z'),
    ).timeLogged).toBe(25 * 60 * 60);
  });

  it('accounts for a running Time Log through the Report Date interval', () => {
    vi.setSystemTime(new Date('2026-05-29T12:00:00.000Z'));
    const task = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2026-05-29T11:30:00.000Z'),
      })],
    });

    expect(service.accountTask(
      task,
      new Date('2026-05-29T12:00:00.000Z'),
    ).timeLogged).toBe(30 * 60);
  });

  it('groups synced time by Report Date in the active timezone', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReportDateCalendar,
        { provide: Locale, useValue: { locale: 'en-US' } },
        { provide: Timezone, useValue: { timezone: 'Europe/Vienna' } },
      ],
    });

    const viennaService = TestBed.inject(ReportDateCalendar);
    const task = new Task({
      jiraWorkLogs: [
        new JiraWorkLog({
          startTime: new Date('2026-06-02T21:00:00.000Z'),
          timeSpentSeconds: 1800,
        }),
      ],
    });

    expect(viennaService.accountTask(task, new Date('2026-06-02T12:00:00.000Z')).timeSynced).toBe(1800);
    expect(viennaService.accountTask(task, new Date('2026-06-03T12:00:00.000Z')).timeSynced).toBe(0);
  });
});
