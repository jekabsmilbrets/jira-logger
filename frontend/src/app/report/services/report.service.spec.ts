import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { TestBed } from '@angular/core/testing';

import { BehaviorSubject, firstValueFrom, of, throwError } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

const waitForDebounce = async () => {
  vi.advanceTimersByTime(260);
  await Promise.resolve();
};

describe('ReportService', () => {
  let service: ReportService;
  let tasksService: { filteredList: ReturnType<typeof vi.fn> };
  let storageService: { read: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let tagsSubject: BehaviorSubject<Tag[]>;

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

    tagsSubject = new BehaviorSubject<Tag[]>([
      { id: 'tag-1', name: 'Backend' } as Tag,
      { id: 'tag-2', name: 'Frontend' } as Tag,
    ]);

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: TasksService, useValue: tasksService },
        { provide: StorageService, useValue: storageService },
        {
          provide: TagsService,
          useValue: { tags$: tagsSubject.asObservable() },
        },
      ],
    });

    service = TestBed.inject(ReportService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes persisted settings and maps saved tag ids', async () => {
    const tags = await firstValueFrom(service.tags$);
    const mode = await firstValueFrom(service.reportMode$);

    expect(storageService.read).toHaveBeenCalledWith('report', 'settings');
    expect(mode).toBe(ReportModeEnum.total);
    expect(tags.map((tag: Tag) => tag.id)).toEqual(['tag-1']);
  });

  it('applies fallback settings when persisted settings are missing', async () => {
    storageService.read.mockReturnValueOnce(of(undefined));

    (service as any).initSettings();

    expect(await firstValueFrom(service.reportMode$)).toBe(ReportModeEnum.total);
    expect(await firstValueFrom(service.tags$)).toEqual([]);
    expect(await firstValueFrom(service.showWeekends$)).toBe(false);
    expect(await firstValueFrom(service.hideUnreportedTasks$)).toBe(false);
  });

  it('handles persisted settings without tags list', async () => {
    TestBed.resetTestingModule();

    const localTagsSubject = new BehaviorSubject<Tag[]>([
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
        { provide: TagsService, useValue: { tags$: localTagsSubject.asObservable() } },
      ],
    });

    const localService = TestBed.inject(ReportService);

    expect(await firstValueFrom(localService.tags$)).toEqual([]);
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
        {
          provide: TagsService,
          useValue: {
            tags$: of({ filter: () => undefined } as any),
          },
        },
      ],
    });

    const localService = TestBed.inject(ReportService);
    expect(await firstValueFrom(localService.tags$)).toEqual([]);
  });

  it('normalizes date, startDate and endDate setters', async () => {
    const date = new Date('2026-05-30T14:20:35.000Z');
    const startDate = new Date('2026-05-01T11:22:33.000Z');
    const endDate = new Date('2026-05-31T00:15:45.000Z');

    service.date = date;
    service.startDate = startDate;
    service.endDate = endDate;

    expect((await firstValueFrom(service.date$))?.getHours()).toBe(0);
    expect((await firstValueFrom(service.startDate$))?.getHours()).toBe(0);
    expect((await firstValueFrom(service.endDate$))?.getHours()).toBe(23);
    expect((await firstValueFrom(service.endDate$))?.getMinutes()).toBe(59);
    expect((await firstValueFrom(service.endDate$))?.getSeconds()).toBe(59);
  });

  it('falls back to total mode when report mode is date without a date value', async () => {
    service.tags = [];
    service.reportMode = ReportModeEnum.date;

    const tasksPromise = firstValueFrom(service.tasks$);
    await waitForDebounce();
    await tasksPromise;

    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      {
        hideUnreported: false,
      },
      true,
    );
    expect(service.columns.some((column) => column.columnDef === 'sync')).toBe(false);
  });

  it('builds day/sync columns for date mode when date is provided', async () => {
    service.tags = [{ id: 'tag-2', name: 'Frontend' } as Tag];
    service.reportMode = ReportModeEnum.date;
    service.date = new Date('2026-05-30T10:00:00.000Z');

    const tasksPromise = firstValueFrom(service.tasks$);
    await waitForDebounce();
    await tasksPromise;

    expect(tasksService.filteredList).toHaveBeenLastCalledWith(
      {
        tags: ['tag-2'],
        date: expect.any(Date),
        hideUnreported: false,
      },
      true,
    );
    expect(service.columns.some((column) => column.columnDef === 'synced')).toBe(true);
    expect(service.columns.some((column) => column.columnDef === 'sync')).toBe(true);
  });

  it('falls back to total mode when dateRange is missing boundaries', async () => {
    service.reportMode = ReportModeEnum.dateRange;
    service.startDate = new Date('2026-05-01T00:00:00.000Z');
    service.endDate = null;

    const tasksPromise = firstValueFrom(service.tasks$);
    await waitForDebounce();
    await tasksPromise;

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

    const tasksPromise = firstValueFrom(service.tasks$);
    await waitForDebounce();
    await tasksPromise;

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
    expect(service.columns.some((column) => column.columnDef === 'timeLogged')).toBe(true);
    expect(service.columns.some((column) => column.columnDef === 'sync')).toBe(false);
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
    const tasksPromise = firstValueFrom(service.tasks$);
    service.reload();
    await waitForDebounce();
    await tasksPromise;

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
    const rangeCols = (service as any).generateMonthColumns(start, end, false, ReportModeEnum.dateRange) as {
      columnDef: string;
      hidden?: boolean
    }[];
    const syncCols = (service as any).generateMonthColumns(start, start, true, ReportModeEnum.date) as { columnDef: string }[];

    expect(rangeCols.some((c) => c.columnDef === 'timeLogged')).toBe(true);
    expect(rangeCols.some((c) => c.hidden === true)).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'synced')).toBe(true);
    expect(syncCols.some((c) => c.columnDef === 'sync')).toBe(true);
  });

  it('executes generated column callbacks (cell/footer/taskSynced)', () => {
    const start = new Date('2026-05-01T00:00:00.000Z');
    const end = new Date('2026-05-02T00:00:00.000Z');
    const cols = (service as any).generateMonthColumns(start, end, true, ReportModeEnum.date) as any[];
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
    const cols = (service as any).generateMonthColumns(start, end, true, ReportModeEnum.total) as any[];

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
