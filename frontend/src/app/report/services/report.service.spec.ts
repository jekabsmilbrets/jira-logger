import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, throwError } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';
import { StorageService } from '@core/services/storage.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

const waitForDebounce = async () => {
  vi.advanceTimersByTime(260);
  await Promise.resolve();
};

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
          reportMode: ReportModeEnum.total,
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
    const tags = service.tags();
    const mode = service.reportMode();

    expect(storageService.read).toHaveBeenCalledWith('report', 'settings');
    expect(mode).toBe(ReportModeEnum.total);
    expect(tags.map((tag: Tag) => tag.id)).toEqual(['tag-1']);
  });

  it('applies fallback settings when persisted settings are missing', async () => {
    storageService.read.mockReturnValueOnce(of(undefined));

    (service as any).initSettings();

    expect(service.reportMode()).toBe(ReportModeEnum.total);
    expect(service.tags()).toEqual([]);
    expect(service.showWeekends()).toBe(false);
    expect(service.hideUnreportedTasks()).toBe(false);
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
        reportMode: ReportModeEnum.total,
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
        reportMode: ReportModeEnum.total,
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
          useValue: {
            tags: signal({ filter: () => undefined } as any).asReadonly(),
          },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);
    expect(localService.tags()).toEqual([]);
  });

  it('normalizes date, startDate and endDate setters', async () => {
    const date = new Date('2026-05-30T14:20:35.000Z');
    const startDate = new Date('2026-05-01T11:22:33.000Z');
    const endDate = new Date('2026-05-31T00:15:45.000Z');
    const dateTimestamp = date.getTime();
    const startDateTimestamp = startDate.getTime();
    const endDateTimestamp = endDate.getTime();

    service.date = date;
    service.startDate = startDate;
    service.endDate = endDate;

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
    service.tags = [];
    service.reportMode = ReportModeEnum.date;

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
    service.tags = [{ id: 'tag-2', name: 'Frontend' } as Tag];
    service.reportMode = ReportModeEnum.date;
    service.date = new Date('2026-05-30T10:00:00.000Z');

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
    service.reportMode = ReportModeEnum.date;
    service.date = new Date('2026-05-30T10:00:00.000Z');

    await waitForDebounce();
    service.tasks();

    expect(service.columns().some((column) => column.columnDef === 'synced')).toBe(false);
    expect(service.columns().some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('falls back to total mode when dateRange is missing boundaries', async () => {
    service.reportMode = ReportModeEnum.dateRange;
    service.startDate = new Date('2026-05-01T00:00:00.000Z');
    service.endDate = null;

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
    service.date = new Date('2026-05-30T10:00:00.000Z');
    service.reportMode = ReportModeEnum.dateRange;
    service.showWeekends = true;
    service.startDate = new Date('2026-05-01T00:00:00.000Z');
    service.endDate = new Date('2026-05-03T00:00:00.000Z');

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

  it('persists settings changes through StorageService.create', async () => {
    service.tags = [{ id: 'tag-1', name: 'Backend' } as Tag];
    service.hideUnreportedTasks = true;
    service.showWeekends = true;
    service.reportMode = ReportModeEnum.total;

    await waitForDebounce();

    expect(storageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        reportMode: ReportModeEnum.total,
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
    service.tags = [{ id: 'tag-2', name: 'Frontend' } as Tag];

    await waitForDebounce();

    expect(storageService.create).toHaveBeenCalled();
  });

  it('generates weekend-hidden range columns and sync columns for date mode', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-04T00:00:00.000Z');
    const rangeCols = (service as any).generateMonthColumns(start, end, false, ReportModeEnum.dateRange, false) as {
      columnDef: string;
      hidden?: boolean
    }[];
    const syncCols = (service as any).generateMonthColumns(start, start, true, ReportModeEnum.date, true) as { columnDef: string }[];
    const noSyncCols = (service as any).generateMonthColumns(start, start, true, ReportModeEnum.date, false) as { columnDef: string }[];

    expect(rangeCols.some((c) => c.columnDef === 'timeLogged')).toBe(true);
    expect(rangeCols.some((c) => c.hidden === true)).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'synced')).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'sync')).toBe(true);
    expect(noSyncCols.some((c) => c.columnDef === 'sync')).toBe(false);
  });

  it('executes generated column callbacks (cell/footer/taskSynced)', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T00:00:00.000Z');
    const cols = (service as any).generateMonthColumns(start, end, true, ReportModeEnum.date, true) as any[];
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
    const cols = (service as any).generateMonthColumns(start, end, true, ReportModeEnum.total, false) as any[];

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
