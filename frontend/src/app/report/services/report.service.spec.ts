import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';
import { StorageService } from '@core/services/storage.service';

import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

const waitForDebounce = async () => {
  vi.advanceTimersByTime(260);
  await Promise.resolve();
};

const columnDefs: (columns: Column[]) => string[] = (columns: Column[]): string[] => columns.map((column: Column) => column.columnDef);

describe('ReportService', () => {
  let service: ReportService;
  let tasksService: { filteredList: ReturnType<typeof vi.fn> };
  let storageService: { read: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let tagsState: ReturnType<typeof signal<Tag[]>>;
  let settingsState: ReturnType<typeof signal<Setting[]>>;

  beforeEach(() => {
    registerLocaleData(localeLv, 'lv-LV');
    vi.useFakeTimers();

    tasksService = {
      filteredList: vi.fn().mockReturnValue(of([])),
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
        { provide: TasksService, useValue: tasksService },
        { provide: StorageService, useValue: storageService },
        { provide: SettingsService, useValue: { settings: settingsState.asReadonly() } },
        {
          provide: TagsService,
          useValue: { tags: tagsState.asReadonly() },
        },
      ],
    });

    service = TestBed.inject(ReportService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes persisted settings and maps saved tag ids', () => {
    TestBed.tick();

    const tags = service.tags();
    const mode = service.reportMode();

    expect(storageService.read).toHaveBeenCalledWith('report', 'settings');
    expect(mode).toBe(ReportMode.total);
    expect(tags.map((tag: Tag) => tag.id)).toEqual(['tag-1']);
  });

  it('applies fallback settings when persisted settings are missing', async () => {
    TestBed.resetTestingModule();

    const localTasksService = {
      filteredList: vi.fn(() => of([])),
    };
    const localStorageService = {
      read: vi.fn(() => of(undefined)),
      create: vi.fn(() => of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TasksService, useValue: localTasksService },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        {
          provide: TagsService,
          useValue: { tags: signal<Tag[]>([]).asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(localService.reportMode()).toBe(ReportMode.total);
    expect(localService.tags()).toEqual([]);
    expect(localService.showWeekends()).toBe(false);
    expect(localService.hideUnreportedTasks()).toBe(false);
  });

  it('handles persisted settings without tags list', async () => {
    TestBed.resetTestingModule();

    const localTagsState = signal<Tag[]>([
      new Tag({ id: 'tag-1', name: 'Backend' }),
    ]);
    const localTasksService = {
      filteredList: vi.fn(() => of([])),
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
        { provide: TasksService, useValue: localTasksService },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        { provide: TagsService, useValue: { tags: localTagsState.asReadonly() } },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(localService.tags()).toEqual([]);
  });

  it('falls back to empty tags when tags filter returns undefined', async () => {
    TestBed.resetTestingModule();

    const localTasksService = {
      filteredList: vi.fn(() => of([])),
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
        { provide: TasksService, useValue: localTasksService },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        {
          provide: TagsService,
          useValue: { tags: signal<Tag[]>([]).asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);
    expect(localService.tags()).toEqual([]);
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
        { provide: TasksService, useValue: { filteredList: vi.fn(() => of([])) } },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
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

    expect(localService.reportMode()).toBe(ReportMode.date);
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
        { provide: TasksService, useValue: { filteredList: vi.fn(() => of([])) } },
        { provide: StorageService, useValue: localStorageService },
        { provide: SettingsService, useValue: { settings: signal<Setting[]>([]).asReadonly() } },
        {
          provide: TagsService,
          useValue: { tags: delayedTagsState.asReadonly() },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(localService.tags()).toEqual([]);

    vi.advanceTimersByTime(260);
    await Promise.resolve();

    expect(localStorageService.create).not.toHaveBeenCalled();

    delayedTagsState.set([
      new Tag({ id: 'tag-1', name: 'Backend' }),
      new Tag({ id: 'tag-2', name: 'Frontend' }),
    ]);
    TestBed.tick();

    expect(localService.tags().map((tag: Tag) => tag.id)).toEqual(['tag-2']);

    await waitForDebounce();

    expect(localStorageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        tags: ['tag-2'],
      }),
      'settings',
    );
  });

  it('normalizes date, startDate and endDate setters', async () => {
    const date = new Date('2026-05-30T14:20:35.000Z');
    const startDate = new Date('2026-05-01T11:22:33.000Z');
    const endDate = new Date('2026-05-31T00:15:45.000Z');
    const dateTimestamp = date.getTime();
    const startDateTimestamp = startDate.getTime();
    const endDateTimestamp = endDate.getTime();

    service.setDate(date);
    service.setStartDate(startDate);
    service.setEndDate(endDate);

    expect(service.date()?.getHours()).toBe(0);
    expect(service.startDate()?.getHours()).toBe(0);
    expect(service.endDate()?.getHours()).toBe(23);
    expect(service.endDate()?.getMinutes()).toBe(59);
    expect(service.endDate()?.getSeconds()).toBe(59);
    expect(date.getTime()).toBe(dateTimestamp);
    expect(startDate.getTime()).toBe(startDateTimestamp);
    expect(endDate.getTime()).toBe(endDateTimestamp);
  });

  it('falls back to total mode when report mode is date without a date value', async () => {
    service.setTags([]);
    service.setReportMode(ReportMode.date);

    await waitForDebounce();
    service.tasks();

    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      {
        hideUnreported: false,
      },
      true,
    );
    expect(service.columns().some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('builds day/sync columns for date mode when date is provided', async () => {
    settingsState.set([
      new Setting({ id: 'jira-enabled', name: JiraApiSettings.enabled, value: 'true' }),
    ]);
    service.setTags([{ id: 'tag-2', name: 'Frontend' } as Tag]);
    service.setReportMode(ReportMode.date);
    service.setDate(new Date('2026-05-30T10:00:00.000Z'));

    await waitForDebounce();
    service.tasks();

    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      {
        tags: ['tag-2'],
        date: expect.any(Date),
        hideUnreported: false,
      },
      true,
    );
    expect(service.columns().some((column) => column.columnDef === 'synced')).toBe(true);
    expect(service.columns().some((column) => column.columnDef === 'sync')).toBe(true);
  });

  it('does not build sync columns for date mode when jira api is disabled', async () => {
    settingsState.set([
      new Setting({ id: 'jira-enabled', name: JiraApiSettings.enabled, value: 'false' }),
    ]);
    service.setReportMode(ReportMode.date);
    service.setDate(new Date('2026-05-30T10:00:00.000Z'));

    await waitForDebounce();
    service.tasks();

    expect(service.columns().some((column) => column.columnDef === 'synced')).toBe(false);
    expect(service.columns().some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('falls back to total mode when dateRange is missing boundaries', async () => {
    service.setReportMode(ReportMode.dateRange);
    service.setStartDate(new Date('2026-05-01T00:00:00.000Z'));
    service.setEndDate(null);

    await waitForDebounce();
    service.tasks();

    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hideUnreported: false,
      }),
      true,
    );
  });

  it('builds range columns and total logged column for valid dateRange', async () => {
    service.setDate(new Date('2026-05-30T10:00:00.000Z'));
    service.setReportMode(ReportMode.dateRange);
    service.setShowWeekends(true);
    service.setStartDate(new Date('2026-05-01T00:00:00.000Z'));
    service.setEndDate(new Date('2026-05-03T00:00:00.000Z'));

    await waitForDebounce();
    service.tasks();

    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        hideUnreported: false,
      }),
      true,
    );
    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      expect.not.objectContaining({
        date: expect.any(Date),
      }),
      true,
    );
    expect(service.columns().some((column) => column.columnDef === 'timeLogged')).toBe(true);
    expect(service.columns().some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('inserts selected tag total columns before total time in total mode', () => {
    const backendTag = { id: 'tag-1', name: 'Backend' } as Tag;
    const frontendTag = { id: 'tag-2', name: 'Frontend' } as Tag;

    service.setTags([
      backendTag,
      frontendTag,
    ]);
    service.setReportMode(ReportMode.total);

    const columns = service.columns();
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
    service.setTags([]);
    expect(service.columns().some((column: Column) => column.columnDef.startsWith('tagTotal_'))).toBe(false);

    service.setTags([{ id: 'tag-1', name: 'Backend' } as Tag]);
    expect(service.columns().some((column: Column) => column.columnDef.startsWith('tagTotal_'))).toBe(false);

    service.setTags([
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    expect(service.columns().filter((column: Column) => column.columnDef.startsWith('tagTotal_')).length).toBe(2);
  });

  it('places date-mode tag total columns after the date column and before sync columns', () => {
    settingsState.set([
      new Setting({ id: 'jira-enabled', name: JiraApiSettings.enabled, value: 'true' }),
    ]);
    service.setTags([
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    service.setReportMode(ReportMode.date);
    service.setDate(new Date('2026-05-01T00:00:00.000Z'));

    const defs = columnDefs(service.columns());
    const dateColumnIndex = defs.findIndex((columnDef: string) => columnDef.startsWith('date-'));

    expect(dateColumnIndex).toBeGreaterThan(-1);
    expect(defs.indexOf('tagTotal_tag-1')).toBeGreaterThan(dateColumnIndex);
    expect(defs.indexOf('tagTotal_tag-2')).toBeGreaterThan(dateColumnIndex);
    expect(defs.indexOf('tagTotal_tag-1')).toBeLessThan(defs.indexOf('synced'));
    expect(defs.indexOf('tagTotal_tag-2')).toBeLessThan(defs.indexOf('sync'));
    expect(defs).not.toContain('timeLogged');
  });

  it('places date-range tag total columns before total time and excludes hidden weekends', () => {
    service.setTags([
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);
    service.setReportMode(ReportMode.dateRange);
    service.setShowWeekends(false);
    service.setStartDate(new Date('2026-05-01T00:00:00.000Z'));
    service.setEndDate(new Date('2026-05-03T00:00:00.000Z'));

    const columns = service.columns();
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
    service.setTags([{ id: 'tag-1', name: 'Backend' } as Tag]);
    service.setHideUnreportedTasks(true);
    service.setShowWeekends(true);
    service.setReportMode(ReportMode.total);

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
    service.tasks();

    expect(tasksService.filteredList).toHaveBeenCalled();
  });

  it('exercises listenToChanges catchError fallback path', async () => {
    storageService.create.mockReturnValueOnce(throwError(() => new Error('persist-fail')));
    service.setTags([{ id: 'tag-2', name: 'Frontend' } as Tag]);

    await waitForDebounce();

    expect(storageService.create).toHaveBeenCalled();
  });

  it('generates weekend-hidden range columns and sync columns for date mode', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-04T00:00:00.000Z');
    const rangeCols = (service as any).generateMonthColumns(start, end, false, ReportMode.dateRange, false) as {
      columnDef: string;
      hidden?: boolean
    }[];
    const syncCols = (service as any).generateMonthColumns(start, start, true, ReportMode.date, true) as { columnDef: string }[];
    const noSyncCols = (service as any).generateMonthColumns(start, start, true, ReportMode.date, false) as { columnDef: string }[];

    expect(rangeCols.some((c) => c.columnDef === 'timeLogged')).toBe(true);
    expect(rangeCols.some((c) => c.hidden === true)).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'synced')).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'sync')).toBe(true);
    expect(noSyncCols.some((c) => c.columnDef === 'sync')).toBe(false);
  });

  it('executes generated column callbacks (cell/footer/taskSynced)', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T00:00:00.000Z');
    const cols = (service as any).generateMonthColumns(start, end, true, ReportMode.date, true) as any[];
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
      if (typeof c.taskSynced === 'function') {
        c.taskSynced(task);
      }
    }

    expect(cols.length).toBeGreaterThan(0);
  });

  it('executes timeLogged column callbacks for non-date report modes', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T00:00:00.000Z');
    const cols = (service as any).generateMonthColumns(start, end, true, ReportMode.total, false) as any[];

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
