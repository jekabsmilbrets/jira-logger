import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService } from '@core/services/storage.service';
import { TimezoneService } from '@core/services/timezone.service';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

import { ReportStateService } from './report-state.service';

const waitForPersistence = async (): Promise<void> => {
  vi.advanceTimersByTime(260);
  await Promise.resolve();
};

describe('Report Service ReportStateService', () => {
  let service: ReportStateService;
  let storageService: { read: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let tagsState: ReturnType<typeof signal<Tag[]>>;

  beforeEach(() => {
    vi.useFakeTimers();

    storageService = {
      read: vi.fn(() => of({
        reportMode: ReportMode.total,
        tags: ['tag-1'],
        date: null,
        startDate: null,
        endDate: null,
        showWeekends: false,
        hideUnreportedTasks: false,
      })),
      create: vi.fn(() => of(undefined)),
    };
    tagsState = signal<Tag[]>([
      new Tag({ id: 'tag-1', name: 'Backend' }),
      new Tag({ id: 'tag-2', name: 'Frontend' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        ReportStateService,
        ReportDateCalendarService,
        { provide: StorageService, useValue: storageService },
        { provide: TagsService, useValue: { tags: tagsState.asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
      ],
    });

    service = TestBed.inject(ReportStateService);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('hydrates persisted settings and maps saved tag ids', () => {
    expect(storageService.read).toHaveBeenCalledWith('report', 'settings');
    expect(service.snapshot().reportMode).toBe(ReportMode.total);
    expect(service.snapshot().tags.map((tag: Tag) => tag.id)).toEqual(['tag-1']);
  });

  it('does not persist before hydration finishes and restores tags after they load later', async () => {
    TestBed.resetTestingModule();

    const delayedTagsState = signal<Tag[]>([]);
    const hydrationState$ = new Subject<any>();
    const localStorageService = {
      read: vi.fn(() => hydrationState$),
      create: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportStateService,
        ReportDateCalendarService,
        { provide: StorageService, useValue: localStorageService },
        { provide: TagsService, useValue: { tags: delayedTagsState.asReadonly() } },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
      ],
    });

    const localService = TestBed.inject(ReportStateService);

    await waitForPersistence();
    expect(localStorageService.create).not.toHaveBeenCalled();

    hydrationState$.next({
      reportMode: ReportMode.date,
      tags: ['tag-2'],
      date: new Date('2026-05-30T00:00:00.000Z'),
      startDate: null,
      endDate: null,
      showWeekends: true,
      hideUnreportedTasks: true,
    });
    hydrationState$.complete();
    TestBed.tick();

    expect(localService.snapshot().tags).toEqual([]);

    delayedTagsState.set([
      new Tag({ id: 'tag-1', name: 'Backend' }),
      new Tag({ id: 'tag-2', name: 'Frontend' }),
    ]);
    TestBed.tick();

    expect(localService.snapshot().tags.map((tag: Tag) => tag.id)).toEqual(['tag-2']);

    await waitForPersistence();
    expect(localStorageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        reportMode: ReportMode.date,
        tags: ['tag-2'],
        showWeekends: true,
        hideUnreportedTasks: true,
      }),
      'settings',
    );
  });

  it('normalizes day boundaries without mutating the original dates', () => {
    const date = new Date('2026-05-30T14:20:35.000Z');
    const startDate = new Date('2026-05-01T11:22:33.000Z');
    const endDate = new Date('2026-05-31T00:15:45.000Z');
    const dateTimestamp = date.getTime();
    const startDateTimestamp = startDate.getTime();
    const endDateTimestamp = endDate.getTime();

    service.applySettingsIntent({ type: 'set-date', date });
    service.applySettingsIntent({ type: 'set-start-date', startDate });
    service.applySettingsIntent({ type: 'set-end-date', endDate });

    expect(service.snapshot().date?.toISOString()).toBe('2026-05-30T00:00:00.000Z');
    expect(service.snapshot().startDate?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(service.snapshot().endDate?.toISOString()).toBe('2026-05-31T23:59:59.999Z');
    expect(date.getTime()).toBe(dateTimestamp);
    expect(startDate.getTime()).toBe(startDateTimestamp);
    expect(endDate.getTime()).toBe(endDateTimestamp);
  });

  it('persists state changes and swallows storage errors', async () => {
    service.applySettingsIntent({ type: 'set-tags', tags: [{ id: 'tag-2', name: 'Frontend' } as Tag] });
    service.applySettingsIntent({ type: 'set-hide-unreported-tasks', hideUnreportedTasks: true });
    service.applySettingsIntent({ type: 'set-show-weekends', showWeekends: true });

    await waitForPersistence();

    expect(storageService.create).toHaveBeenCalledWith(
      'report',
      expect.objectContaining({
        tags: ['tag-2'],
        showWeekends: true,
        hideUnreportedTasks: true,
      }),
      'settings',
    );

    storageService.create.mockReturnValueOnce(throwError(() => new Error('persist-fail')));
    service.applySettingsIntent({ type: 'set-report-mode', reportMode: ReportMode.date });

    await waitForPersistence();

    expect(storageService.create).toHaveBeenCalled();
  });

  it('accepts null date and tag patches as empty state', () => {
    service.applySettingsIntent({ type: 'set-date', date: null });
    service.applySettingsIntent({ type: 'set-tags', tags: null as any });

    expect(service.snapshot().date).toBeNull();
    expect(service.snapshot().tags).toEqual([]);
  });
});
