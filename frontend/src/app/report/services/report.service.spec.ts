import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';
import { StorageService } from '@core/services/storage.service';
import { TimezoneService } from '@core/services/timezone.service';

import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TaskQueryService } from '@shared/services/task-query.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { ReportColumnsService } from '@report/services/report-columns.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

const waitForDebounce = async () => {
  vi.advanceTimersByTime(260);
  await Promise.resolve();
};

const columnDefs: (columns: Column[]) => string[] = (columns: Column[]): string[] => columns.map((column: Column) => column.columnDef);
const applyReportMode = (service: ReportService, reportMode: ReportMode): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-report-mode', reportMode } });
};
const applyTags = (service: ReportService, tags: Tag[]): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-tags', tags } });
};
const applyDate = (service: ReportService, date: Date | null): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-date', date } });
};
const applyStartDate = (service: ReportService, startDate: Date | null): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-start-date', startDate } });
};
const applyEndDate = (service: ReportService, endDate: Date | null): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-end-date', endDate } });
};
const applyShowWeekends = (service: ReportService, showWeekends: boolean): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-show-weekends', showWeekends } });
};
const applyHideUnreportedTasks = (service: ReportService, hideUnreportedTasks: boolean): void => {
  service.applySettingsChange({ type: 'settings-intent', intent: { type: 'set-hide-unreported-tasks', hideUnreportedTasks } });
};

describe('Report Service ReportService', () => {
  let service: ReportService;
  let taskQueryService: { query: ReturnType<typeof vi.fn> };
  let storageService: { read: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let tagsState: ReturnType<typeof signal<Tag[]>>;
  let settingsState: ReturnType<typeof signal<Setting[]>>;
  let reportColumnsService: ReportColumnsService;

  beforeEach(() => {
    registerLocaleData(localeLv, 'lv-LV');
    vi.useFakeTimers();

    taskQueryService = {
      query: vi.fn().mockReturnValue(of([])),
    };

    storageService = {
      read: vi.fn().mockReturnValue(
        of({
          reportMode: ReportMode.total,
          tags: ['tag-1'],
          date: null,
          startDate: null,
          endDate: null,
          showWeekends: false,
          hideUnreportedTasks: false,
        }),
      ),
      create: vi.fn().mockReturnValue(of(undefined)),
    };

    tagsState = signal<Tag[]>([
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    settingsState = signal<Setting[]>([]);

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: taskQueryService },
        { provide: StorageService, useValue: storageService },
        { provide: SettingsService, useValue: { settings: settingsState.asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: { tags: tagsState.asReadonly() },
        },
      ],
    });

    service = TestBed.inject(ReportService);
    reportColumnsService = TestBed.inject(ReportColumnsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes persisted settings and maps saved tag ids', () => {
    TestBed.tick();

    const settings = service.settingsControlsState();

    expect(storageService.read).toHaveBeenCalledWith('report', 'settings');
    expect(settings.reportMode).toBe(ReportMode.total);
    expect(settings.tags.map((tag: Tag) => tag.id)).toEqual(['tag-1']);
  });

  it('applies fallback settings when persisted settings are missing', async () => {
    TestBed.resetTestingModule();

    const localTaskQueryService = {
      query: vi.fn(() => of([])),
    };
    const localStorageService = {
      read: vi.fn(() => of(undefined)),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: localTaskQueryService },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: { tags: signal<Tag[]>([]).asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(localService.settingsControlsState().reportMode).toBe(ReportMode.total);
    expect(localService.settingsControlsState().tags).toEqual([]);
    expect(localService.settingsControlsState().showWeekends).toBe(false);
    expect(localService.settingsControlsState().hideUnreportedTasks).toBe(false);
  });

  it('handles persisted settings without tags list', async () => {
    TestBed.resetTestingModule();

    const localTagsState = signal<Tag[]>([
      new Tag({ id: 'tag-1', name: 'Backend' }),
    ]);
    const localTaskQueryService = {
      query: vi.fn(() => of([])),
    };
    const localStorageService = {
      read: vi.fn(() => of({
        reportMode: ReportMode.total,
        date: null,
        startDate: null,
        endDate: null,
        showWeekends: false,
        hideUnreportedTasks: false,
      } as any)),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: localTaskQueryService },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        { provide: TagsService, useValue: { tags: localTagsState.asReadonly() } },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(localService.settingsControlsState().tags).toEqual([]);
  });

  it('falls back to empty tags when tags filter returns undefined', async () => {
    TestBed.resetTestingModule();

    const localTaskQueryService = {
      query: vi.fn(() => of([])),
    };
    const localStorageService = {
      read: vi.fn(() => of({
        reportMode: ReportMode.total,
        tags: ['tag-1'],
        date: null,
        startDate: null,
        endDate: null,
        showWeekends: false,
        hideUnreportedTasks: false,
      })),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: localTaskQueryService },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: { tags: signal<Tag[]>([]).asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);
    expect(localService.settingsControlsState().tags).toEqual([]);
  });

  it('does not persist default state before startup hydration finishes', async () => {
    TestBed.resetTestingModule();

    const hydrationState$ = new Subject<any>();
    const localStorageService = {
      read: vi.fn(() => hydrationState$),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: { query: vi.fn(() => of([])) } },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: {
            tags: signal<Tag[]>([
              new Tag({ id: 'tag-1', name: 'Backend' }),
            ]).asReadonly(),
          },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);

    vi.advanceTimersByTime(260);
    await Promise.resolve();

    expect(localStorageService.create).not.toHaveBeenCalled();

    hydrationState$.next({
      reportMode: ReportMode.date,
      tags: ['tag-1'],
      date: new Date('2026-05-30T00:00:00.000Z'),
      startDate: null,
      endDate: null,
      showWeekends: true,
      hideUnreportedTasks: true,
    });
    hydrationState$.complete();
    TestBed.tick();

    await waitForDebounce();

    expect(localService.settingsControlsState().reportMode).toBe(ReportMode.date);
    expect(localStorageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        reportMode: ReportMode.date,
        tags: ['tag-1'],
        showWeekends: true,
        hideUnreportedTasks: true,
      }),
      'settings',
    );
  });

  it('restores persisted tags after tags load later', async () => {
    TestBed.resetTestingModule();

    const delayedTagsState = signal<Tag[]>([]);
    const localStorageService = {
      read: vi.fn(() => of({
        reportMode: ReportMode.total,
        tags: ['tag-2'],
        date: null,
        startDate: null,
        endDate: null,
        showWeekends: false,
        hideUnreportedTasks: false,
      })),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: { query: vi.fn(() => of([])) } },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: { tags: delayedTagsState.asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(localService.settingsControlsState().tags).toEqual([]);

    vi.advanceTimersByTime(260);
    await Promise.resolve();

    expect(localStorageService.create).not.toHaveBeenCalled();

    delayedTagsState.set([
      new Tag({ id: 'tag-1', name: 'Backend' }),
      new Tag({ id: 'tag-2', name: 'Frontend' }),
    ]);
    TestBed.tick();

    expect(localService.settingsControlsState().tags.map((tag: Tag) => tag.id)).toEqual(['tag-2']);

    await waitForDebounce();

    expect(localStorageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        tags: ['tag-2'],
      }),
      'settings',
    );
  });

  it('normalizes date, startDate and endDate through report settings', async () => {
    const date = new Date('2026-05-30T14:20:35.000Z');
    const startDate = new Date('2026-05-01T11:22:33.000Z');
    const endDate = new Date('2026-05-31T00:15:45.000Z');
    const dateTimestamp = date.getTime();
    const startDateTimestamp = startDate.getTime();
    const endDateTimestamp = endDate.getTime();

    applyDate(service, date);
    applyStartDate(service, startDate);
    applyEndDate(service, endDate);

    expect(service.settingsControlsState().date?.toISOString()).toBe('2026-05-30T00:00:00.000Z');
    expect(service.settingsControlsState().startDate?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(service.settingsControlsState().endDate?.toISOString()).toBe('2026-05-31T23:59:59.999Z');
    expect(date.getTime()).toBe(dateTimestamp);
    expect(startDate.getTime()).toBe(startDateTimestamp);
    expect(endDate.getTime()).toBe(endDateTimestamp);
  });

  it('applies every report settings intent through one interface', () => {
    const date = new Date('2026-05-30T14:20:35.000Z');
    const startDate = new Date('2026-05-01T14:20:35.000Z');
    const endDate = new Date('2026-05-31T14:20:35.000Z');
    const tags = [{ id: 'tag-2', name: 'Frontend' } as Tag];

    applyReportMode(service, ReportMode.date);
    applyTags(service, tags);
    applyDate(service, date);
    applyStartDate(service, startDate);
    applyEndDate(service, endDate);
    applyShowWeekends(service, true);
    applyHideUnreportedTasks(service, true);

    expect(service.settingsControlsState().reportMode).toBe(ReportMode.date);
    expect(service.settingsControlsState().tags).toEqual(tags);
    expect(service.settingsControlsState().date?.toISOString()).toBe('2026-05-30T00:00:00.000Z');
    expect(service.settingsControlsState().startDate?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(service.settingsControlsState().endDate?.toISOString()).toBe('2026-05-31T23:59:59.999Z');
    expect(service.settingsControlsState().showWeekends).toBe(true);
    expect(service.settingsControlsState().hideUnreportedTasks).toBe(true);
  });

  it('applies report route params inside the report module', () => {
    service.applySettingsChange({
      type: 'route-settings',
      routeSettings: {
        reportMode: ReportMode.date,
        date: '2026-05-30',
      },
    });

    expect(service.settingsControlsState().reportMode).toBe(ReportMode.date);
    expect(service.settingsControlsState().date?.getTime()).toBe(
      TestBed.inject(ReportDateCalendarService).parseRouteDate('2026-05-30')?.getTime(),
    );
  });

  it('applies today for date mode route without date param', () => {
    vi.setSystemTime(new Date('2026-05-30T12:00:00.000Z'));

    service.applySettingsChange({
      type: 'route-settings',
      routeSettings: {
        reportMode: ReportMode.date,
        date: null,
      },
    });

    expect(service.settingsControlsState().reportMode).toBe(ReportMode.date);
    expect(service.settingsControlsState().date?.getTime()).toBe(
      TestBed.inject(ReportDateCalendarService).todayReportDate().getTime(),
    );
  });

  it('ignores routes without a report mode and normalizes unknown non-date modes', () => {
    service.applySettingsChange({ type: 'route-settings', routeSettings: {} as any });
    service.applySettingsChange({
      type: 'route-settings',
      routeSettings: { reportMode: 'unknown' as ReportMode, date: null },
    });

    expect(service.settingsControlsState().reportMode).toBe(ReportMode.total);
  });

  it('applies date mode without a date when the route date is invalid', () => {
    service.applySettingsChange({
      type: 'route-settings',
      routeSettings: { reportMode: ReportMode.date, date: 'not-a-date' },
    });

    expect(service.settingsControlsState().reportMode).toBe(ReportMode.date);
  });

  it('keeps route mode and date when delayed persisted settings hydrate', () => {
    TestBed.resetTestingModule();

    const hydrationState$ = new Subject<any>();
    const localStorageService = {
      read: vi.fn(() => hydrationState$),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: { query: vi.fn(() => of([])) } },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: { tags: signal<Tag[]>([]).asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);
    localService.applySettingsChange({
      type: 'route-settings',
      routeSettings: {
        reportMode: ReportMode.date,
        date: '2021-01-01',
      },
    });

    hydrationState$.next({
      reportMode: ReportMode.dateRange,
      tags: [],
      date: null,
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-05-31T00:00:00.000Z'),
      showWeekends: true,
      hideUnreportedTasks: true,
    });
    hydrationState$.complete();

    expect(localService.settingsControlsState().reportMode).toBe(ReportMode.date);
    expect(localService.settingsControlsState().date?.getTime()).toBe(
      TestBed.inject(ReportDateCalendarService).parseRouteDate('2021-01-01')?.getTime(),
    );
    expect(localService.settingsControlsState().showWeekends).toBe(true);
    expect(localService.settingsControlsState().hideUnreportedTasks).toBe(true);
  });

  it('does not reuse persisted date for an invalid route date', () => {
    TestBed.resetTestingModule();

    const hydrationState$ = new Subject<any>();
    const localStorageService = {
      read: vi.fn(() => hydrationState$),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TaskQueryService, useValue: { query: vi.fn(() => of([])) } },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
        {
          provide: TagsService,
          useValue: { tags: signal<Tag[]>([]).asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);
    localService.applySettingsChange({
      type: 'route-settings',
      routeSettings: {
        reportMode: ReportMode.date,
        date: 'not-a-date',
      },
    });

    hydrationState$.next({
      reportMode: ReportMode.total,
      tags: [],
      date: new Date('2026-05-30T00:00:00.000Z'),
      startDate: null,
      endDate: null,
      showWeekends: false,
      hideUnreportedTasks: false,
    });
    hydrationState$.complete();

    expect(localService.settingsControlsState().reportMode).toBe(ReportMode.date);
    expect(localService.settingsControlsState().date).toBeNull();
  });

  it('falls back to total mode when report mode is date without a date value', async () => {
    applyTags(service, []);
    applyReportMode(service, ReportMode.date);

    await waitForDebounce();
    void service.viewState().tasks;

    expect(service.viewState().canSyncJiraWorkLogs).toBe(false);
    expect(taskQueryService.query).toHaveBeenLastCalledWith(
      {
        hideUnreported: false,
      },
    );
    expect(service.viewState().columns.some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('builds day/synced columns for date mode when date is provided', async () => {
    settingsState.set([
      new Setting({ id: 'jira-enabled', name: JiraApiSettings.enabled, value: 'true' }),
    ]);
    applyTags(service, [{ id: 'tag-2', name: 'Frontend' } as Tag]);
    applyReportMode(service, ReportMode.date);
    applyDate(service, new Date('2026-05-30T10:00:00.000Z'));

    await waitForDebounce();
    void service.viewState().tasks;

    expect(taskQueryService.query).toHaveBeenLastCalledWith(
      {
        tags: ['tag-2'],
        date: '2026-05-30',
        hideUnreported: false,
      },
    );
    expect(service.viewState().columns.some((column) => column.columnDef === 'synced')).toBe(true);
    expect(service.viewState().columns.some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('does not build sync columns for date mode when jira api is disabled', async () => {
    settingsState.set([
      new Setting({ id: 'jira-enabled', name: JiraApiSettings.enabled, value: 'false' }),
    ]);
    applyReportMode(service, ReportMode.date);
    applyDate(service, new Date('2026-05-30T10:00:00.000Z'));

    await waitForDebounce();
    void service.viewState().tasks;

    expect(service.viewState().columns.some((column) => column.columnDef === 'synced')).toBe(false);
    expect(service.viewState().columns.some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('falls back to total mode when dateRange is missing boundaries', async () => {
    applyReportMode(service, ReportMode.dateRange);
    applyStartDate(service, new Date('2026-05-01T00:00:00.000Z'));
    applyEndDate(service, null);

    await waitForDebounce();
    void service.viewState().tasks;

    expect(taskQueryService.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideUnreported: false,
      }),
    );
  });

  it('builds range columns and total logged column for valid dateRange', async () => {
    applyDate(service, new Date('2026-05-30T10:00:00.000Z'));
    applyReportMode(service, ReportMode.dateRange);
    applyShowWeekends(service, true);
    applyStartDate(service, new Date('2026-05-01T00:00:00.000Z'));
    applyEndDate(service, new Date('2026-05-03T00:00:00.000Z'));

    await waitForDebounce();
    void service.viewState().tasks;

    expect(taskQueryService.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        hideUnreported: false,
      }),
    );
    expect(taskQueryService.query).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        date: expect.anything(),
      }),
    );
    expect(service.viewState().columns.some((column) => column.columnDef === 'timeLogged')).toBe(true);
    expect(service.viewState().columns.some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('inserts selected tag total columns before total time in total mode', () => {
    const backendTag = { id: 'tag-1', name: 'Backend' } as Tag;
    const frontendTag = { id: 'tag-2', name: 'Frontend' } as Tag;

    applyTags(service, [
      backendTag,
      frontendTag,
    ]);
    applyReportMode(service, ReportMode.total);

    const columns = service.viewState().columns;
    const defs = columnDefs(columns);
    const backendColumn = columns.find((column: Column) => column.columnDef === 'tagTotal_tag-1');
    const backendTask = new Task({
      tags: [backendTag],
      timeLogs: [],
    } as Partial<Task>);
    const frontendTask = new Task({
      tags: [frontendTag],
      timeLogs: [],
    } as Partial<Task>);
    backendTask.timeLogged = 60;
    frontendTask.timeLogged = 120;

    expect(defs).toContain('tagTotal_tag-1');
    expect(defs).toContain('tagTotal_tag-2');
    expect(defs.indexOf('tagTotal_tag-1')).toBeLessThan(defs.indexOf('timeLogged'));
    expect(defs.indexOf('tagTotal_tag-2')).toBeLessThan(defs.indexOf('timeLogged'));
    expect(backendColumn?.cell(backendTask)).toBe(60);
    expect(backendColumn?.footerCell?.([
      backendTask,
      frontendTask,
    ])).toBe(60);
  });

  it('does not add tag total columns unless at least two valid tags are selected', () => {
    applyTags(service, []);
    expect(service.viewState().columns.some((column: Column) => column.columnDef.startsWith('tagTotal_'))).toBe(false);

    applyTags(service, [{ id: 'tag-1', name: 'Backend' } as Tag]);
    expect(service.viewState().columns.some((column: Column) => column.columnDef.startsWith('tagTotal_'))).toBe(false);

    applyTags(service, [
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    expect(service.viewState().columns.filter((column: Column) => column.columnDef.startsWith('tagTotal_')).length).toBe(2);
  });

  it('places date-mode tag total columns after the date column and before sync columns', () => {
    settingsState.set([
      new Setting({ id: 'jira-enabled', name: JiraApiSettings.enabled, value: 'true' }),
    ]);
    applyTags(service, [
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    applyReportMode(service, ReportMode.date);
    applyDate(service, new Date('2026-05-01T00:00:00.000Z'));

    const defs = columnDefs(service.viewState().columns);
    const dateColumnIndex = defs.findIndex((columnDef: string) => columnDef.startsWith('date-'));

    expect(dateColumnIndex).toBeGreaterThan(-1);
    expect(defs.indexOf('tagTotal_tag-1')).toBeGreaterThan(dateColumnIndex);
    expect(defs.indexOf('tagTotal_tag-2')).toBeGreaterThan(dateColumnIndex);
    expect(defs.indexOf('tagTotal_tag-1')).toBeLessThan(defs.indexOf('synced'));
    expect(defs.indexOf('tagTotal_tag-2')).toBeLessThan(defs.indexOf('synced'));
    expect(defs).not.toContain('timeLogged');
  });

  it('places date-range tag total columns before total time and excludes hidden weekends', () => {
    applyTags(service, [
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    applyReportMode(service, ReportMode.dateRange);
    applyShowWeekends(service, false);
    applyStartDate(service, new Date('2026-05-01T00:00:00.000Z'));
    applyEndDate(service, new Date('2026-05-03T00:00:00.000Z'));

    const columns = service.viewState().columns;
    const defs = columnDefs(columns);
    const backendColumn = columns.find((column: Column) => column.columnDef === 'tagTotal_tag-1');
    const frontendColumn = columns.find((column: Column) => column.columnDef === 'tagTotal_tag-2');
    const backendTask = new Task({
      tags: [{ id: 'tag-1', name: 'Backend' } as Tag],
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-05-01T10:00:00.000Z'),
          endTime: new Date('2026-05-01T10:01:00.000Z'),
        } as any),
        new TimeLog({
          startTime: new Date('2026-05-02T10:00:00.000Z'),
          endTime: new Date('2026-05-02T10:02:00.000Z'),
        } as any),
      ],
    } as Partial<Task>);
    const frontendTask = new Task({
      tags: [{ id: 'tag-2', name: 'Frontend' } as Tag],
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-05-02T10:00:00.000Z'),
          endTime: new Date('2026-05-02T10:02:00.000Z'),
        } as any),
      ],
    } as Partial<Task>);

    expect(defs.indexOf('tagTotal_tag-1')).toBeLessThan(defs.indexOf('timeLogged'));
    expect(defs.indexOf('tagTotal_tag-2')).toBeLessThan(defs.indexOf('timeLogged'));
    expect(backendColumn?.cell(backendTask)).toBe(60);
    expect(backendColumn?.footerCell?.([
      backendTask,
      frontendTask,
    ])).toBe(60);
    expect(frontendColumn?.cell(frontendTask)).toBe(0);
    expect(frontendColumn?.footerCell?.([
      backendTask,
      frontendTask,
    ])).toBe(0);
  });

  it('persists settings changes through StorageService.create', async () => {
    applyTags(service, [{ id: 'tag-1', name: 'Backend' } as Tag]);
    applyHideUnreportedTasks(service, true);
    applyShowWeekends(service, true);
    applyReportMode(service, ReportMode.total);

    await waitForDebounce();

    expect(storageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        reportMode: ReportMode.total,
        tags: ['tag-1'],
        showWeekends: true,
        hideUnreportedTasks: true,
      }),
      'settings',
    );
  });

  it('reload triggers tasks recalculation stream', async () => {
    service.reload();
    await waitForDebounce();
    void service.viewState().tasks;

    expect(taskQueryService.query).toHaveBeenCalled();
  });

  it('returns an empty task list when the report query fails', async () => {
    taskQueryService.query.mockReturnValueOnce(throwError(() => new Error('query failed')));

    service.reload();
    await waitForDebounce();

    expect(service.viewState().tasks).toEqual([]);
  });

  it('exercises listenToChanges catchError fallback path', async () => {
    storageService.create.mockReturnValueOnce(throwError(() => new Error('persist-fail')));
    applyTags(service, [{ id: 'tag-2', name: 'Frontend' } as Tag]);

    await waitForDebounce();

    expect(storageService.create).toHaveBeenCalled();
  });

  it('generates weekend-hidden range columns and synced columns for date mode', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-04T00:00:00.000Z');
    const rangeCols = reportColumnsService.buildColumns({
      reportMode: ReportMode.dateRange,
      tags: [],
      date: null,
      startDate: start,
      endDate: end,
      showWeekends: false,
      hideUnreportedTasks: false,
    }, ReportMode.dateRange, false) as {
      columnDef: string;
      hidden?: boolean
    }[];
    const syncCols = reportColumnsService.buildColumns({
      reportMode: ReportMode.date,
      tags: [],
      date: start,
      startDate: null,
      endDate: null,
      showWeekends: true,
      hideUnreportedTasks: false,
    }, ReportMode.date, true) as { columnDef: string }[];
    const noSyncCols = reportColumnsService.buildColumns({
      reportMode: ReportMode.date,
      tags: [],
      date: start,
      startDate: null,
      endDate: null,
      showWeekends: true,
      hideUnreportedTasks: false,
    }, ReportMode.date, false) as { columnDef: string }[];

    expect(rangeCols.some((c) => c.columnDef === 'timeLogged')).toBe(true);
    expect(rangeCols.some((c) => c.hidden === true)).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'synced')).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'sync')).toBe(false);
    expect(noSyncCols.some((c) => c.columnDef === 'sync')).toBe(false);
  });

  it('executes generated column callbacks', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T00:00:00.000Z');
    const cols = reportColumnsService.buildColumns({
      reportMode: ReportMode.date,
      tags: [],
      date: start,
      startDate: null,
      endDate: end,
      showWeekends: true,
      hideUnreportedTasks: false,
    }, ReportMode.date, true) as any[];
    const syncedDay = new Date(start.getTime());
    syncedDay.setHours(0, 0, 0, 0);
    const task = new Task({
      id: '1',
      name: 'T',
      tags: [],
      timeLogs: [
        new TimeLog({ startTime: new Date('2026-05-01T10:00:00.000Z'), endTime: new Date('2026-05-01T10:01:00.000Z') } as any),
      ],
      jiraWorkLogs: [{ startTime: syncedDay, timeSpentSeconds: 60 }] as any,
    } as any);

    for (const c of cols) {
      if (typeof c.cell === 'function') {
        c.cell(task);
      }
      if (typeof c.footerCell === 'function') {
        c.footerCell([task]);
      }
    }

    expect(cols.length).toBeGreaterThan(0);
  });

  it('executes timeLogged column callbacks for non-date report modes', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T00:00:00.000Z');
    const cols = reportColumnsService.buildColumns({
      reportMode: ReportMode.dateRange,
      tags: [],
      date: null,
      startDate: start,
      endDate: end,
      showWeekends: true,
      hideUnreportedTasks: false,
    }, ReportMode.dateRange, false) as any[];

    const task = new Task({
      id: '2',
      name: 'Task 2',
      tags: [],
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-05-01T10:00:00.000Z'),
          endTime: new Date('2026-05-01T10:01:30.000Z'),
        } as any),
      ],
    } as any);

    const timeLoggedColumn = cols.find((c) => c.columnDef === 'timeLogged');
    expect(timeLoggedColumn).toBeTruthy();
    expect(timeLoggedColumn.cell(task)).toBe(task.calcTimeLogged());
    expect(timeLoggedColumn.footerCell([task])).toBe(task.calcTimeLogged());
  });
});
