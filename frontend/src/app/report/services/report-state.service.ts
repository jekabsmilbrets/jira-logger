import { computed, effect, inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, of, take, tap } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { defaultReportSettingsStorageValue } from '@report/constants/default-report-settings-storage-value.constant';
import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import type { ReportSettingsStorageValue } from '@report/interfaces/report-settings-storage-value.interface';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

@Service()
export class ReportStateService {
  private readonly storageService: StorageService = inject(StorageService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);

  private readonly reportModeSignal: WritableSignal<ReportMode> = signal<ReportMode>(ReportMode.total);
  private readonly tagsSignal: WritableSignal<Tag[]> = signal<Tag[]>([]);
  private readonly dateSignal: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly startDateSignal: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly endDateSignal: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly showWeekendsSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly hideUnreportedTasksSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly isHydratedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly pendingPersistedTagIdsSignal: WritableSignal<string[] | null> = signal<string[] | null>(null);
  private routeSettingsBeforeHydration: Partial<Pick<ReportStateSnapshot, 'reportMode' | 'date'>> = {};

  private readonly settingsKey: IDBValidKey = 'report';
  private readonly customStoreName: string = 'settings';

  public readonly snapshot: Signal<ReportStateSnapshot> = computed(() => this.getStateSnapshot());
  public readonly effectiveReportMode: Signal<ReportMode> = computed(() => this.getEffectiveReportMode(
    this.reportModeSignal(),
    this.dateSignal(),
    this.startDateSignal(),
    this.endDateSignal(),
  ));
  public readonly showDatePicker: Signal<boolean> = computed(() => [
    ReportMode.dateRange,
    ReportMode.date,
  ].includes(this.reportModeSignal()));
  public readonly taskFilter: Signal<TaskListFilter> = computed(() => this.buildTaskFilter(
    this.snapshot(),
    this.effectiveReportMode(),
  ));

  public constructor() {
    this.initSettings();
    this.registerPersistedTagReconciliation();
    this.registerSettingsPersistence();
  }

  private updateSettings(
    patch: Partial<ReportStateSnapshot>,
  ): void {
    if (patch.reportMode !== undefined) {
      this.reportModeSignal.set(patch.reportMode);
    }

    if (patch.tags !== undefined) {
      this.pendingPersistedTagIdsSignal.set(null);
      this.tagsSignal.set([...(patch.tags ?? [])]);

      if (!this.isHydratedSignal()) {
        this.finishHydration();
      }
    }

    if (patch.date !== undefined) {
      this.dateSignal.set(this.normalizeStartOfDay(patch.date));
    }

    if (patch.startDate !== undefined) {
      this.startDateSignal.set(this.normalizeStartOfDay(patch.startDate));
    }

    if (patch.endDate !== undefined) {
      this.endDateSignal.set(this.normalizeEndOfDay(patch.endDate));
    }

    if (patch.showWeekends !== undefined) {
      this.showWeekendsSignal.set(patch.showWeekends);
    }

    if (patch.hideUnreportedTasks !== undefined) {
      this.hideUnreportedTasksSignal.set(patch.hideUnreportedTasks);
    }
  }

  public applySettingsIntent(
    intent: ReportSettingsIntent,
  ): void {
    switch (intent.type) {
      case 'set-report-mode':
        this.updateSettings({ reportMode: intent.reportMode });
        break;
      case 'set-tags':
        this.updateSettings({ tags: intent.tags });
        break;
      case 'set-date':
        this.updateSettings({ date: intent.date });
        break;
      case 'set-start-date':
        this.updateSettings({ startDate: intent.startDate });
        break;
      case 'set-end-date':
        this.updateSettings({ endDate: intent.endDate });
        break;
      case 'set-show-weekends':
        this.updateSettings({ showWeekends: intent.showWeekends });
        break;
      case 'set-hide-unreported-tasks':
        this.updateSettings({ hideUnreportedTasks: intent.hideUnreportedTasks });
        break;
    }
  }

  public applyRouteSettings(
    patch: Partial<Pick<ReportStateSnapshot, 'reportMode' | 'date'>>,
  ): void {
    this.updateSettings(patch);

    if (!this.isHydratedSignal()) {
      this.routeSettingsBeforeHydration = {
        ...this.routeSettingsBeforeHydration,
        ...patch,
        date: patch.date !== undefined ? this.cloneDate(patch.date) : this.routeSettingsBeforeHydration.date,
      };
    }
  }

  private getStateSnapshot(): ReportStateSnapshot {
    return {
      reportMode: this.reportModeSignal(),
      tags: [...this.tagsSignal()],
      date: this.cloneDate(this.dateSignal()),
      startDate: this.cloneDate(this.startDateSignal()),
      endDate: this.cloneDate(this.endDateSignal()),
      showWeekends: this.showWeekendsSignal(),
      hideUnreportedTasks: this.hideUnreportedTasksSignal(),
    };
  }

  private getEffectiveReportMode(
    reportMode: ReportMode,
    date: Date | null,
    startDate: Date | null,
    endDate: Date | null,
  ): ReportMode {
    const isInvalidMode: Record<ReportMode, boolean> = {
      [ReportMode.total]: false,
      [ReportMode.date]: !date,
      [ReportMode.dateRange]: !startDate || !endDate,
    };

    return isInvalidMode[reportMode] ?
      ReportMode.total :
      reportMode;
  }

  private registerSettingsPersistence(): void {
    effect((onCleanup) => {
      if (!this.isHydratedSignal()) {
        return;
      }

      const state: ReportStateSnapshot = this.getStateSnapshot();
      const timeoutId: ReturnType<typeof setTimeout> = this.scheduleStatePersistence(state);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  private registerPersistedTagReconciliation(): void {
    effect(() => {
      this.resolvePendingPersistedTags();
    });
  }

  private initSettings(): void {
    this.storageService.read<ReportSettingsStorageValue | undefined>(
      this.settingsKey,
      this.customStoreName,
    )
      .pipe(
        take(1),
        tap((settings: ReportSettingsStorageValue | undefined) => this.applyPersistedSettings(settings)),
      )
      .subscribe();
  }

  private finishHydration(): void {
    this.isHydratedSignal.set(true);
  }

  private resolvePendingPersistedTags(): void {
    const pendingPersistedTagIds: string[] | null = this.pendingPersistedTagIdsSignal();

    if (pendingPersistedTagIds === null) {
      return;
    }

    if (pendingPersistedTagIds.length === 0) {
      this.tagsSignal.set([]);
      this.pendingPersistedTagIdsSignal.set(null);
      this.finishHydration();
      return;
    }

    const availableTags: Tag[] = this.tagsService.tags();

    if (availableTags.length === 0) {
      return;
    }

    this.completeTagHydration(
      availableTags.filter((tag: Tag) => pendingPersistedTagIds.includes(tag.id)),
    );
  }

  private scheduleStatePersistence(
    state: ReportStateSnapshot,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      this.persistStateSnapshot(state);
    }, 250);
  }

  private persistStateSnapshot(
    state: ReportStateSnapshot,
  ): void {
    this.storageService.create(
      this.settingsKey,
      this.toStorageValue(state),
      this.customStoreName,
    )
      .pipe(
        take(1),
        catchError(() => of(undefined)),
      )
      .subscribe();
  }

  private toStorageValue(
    state: ReportStateSnapshot,
  ): ReportSettingsStorageValue {
    return {
      reportMode: state.reportMode,
      tags: state.tags.map((tag: Tag) => tag.id),
      date: state.date,
      startDate: state.startDate,
      endDate: state.endDate,
      showWeekends: state.showWeekends,
      hideUnreportedTasks: state.hideUnreportedTasks,
    };
  }

  private applyPersistedSettings(
    settings: ReportSettingsStorageValue | undefined,
  ): void {
    const persistedSettings: ReportSettingsStorageValue = {
      ...defaultReportSettingsStorageValue,
      ...settings,
      tags: [...(settings?.tags ?? [])],
    };

    this.reportModeSignal.set(this.routeSettingsBeforeHydration.reportMode ?? persistedSettings.reportMode);
    this.dateSignal.set(this.cloneDate(
      'date' in this.routeSettingsBeforeHydration ?
        this.routeSettingsBeforeHydration.date :
        persistedSettings.date,
    ));
    this.startDateSignal.set(this.cloneDate(persistedSettings.startDate));
    this.endDateSignal.set(this.cloneDate(persistedSettings.endDate));
    this.showWeekendsSignal.set(persistedSettings.showWeekends);
    this.hideUnreportedTasksSignal.set(persistedSettings.hideUnreportedTasks);
    this.pendingPersistedTagIdsSignal.set(persistedSettings.tags);
    this.resolvePendingPersistedTags();
  }

  private completeTagHydration(
    tags: Tag[],
  ): void {
    this.tagsSignal.set(tags);
    this.pendingPersistedTagIdsSignal.set(null);
    this.finishHydration();
  }

  private buildTaskFilter(
    state: ReportStateSnapshot,
    reportMode: ReportMode,
  ): TaskListFilter {
    const filter: TaskListFilter = {
      tags: state.tags.map((tag) => tag.id),
      date: state.date,
      startDate: state.startDate,
      endDate: state.endDate,
      hideUnreported: state.hideUnreportedTasks,
    };

    if (state.tags.length === 0) {
      delete filter.tags;
    }

    if (reportMode === ReportMode.total) {
      delete filter.date;
      delete filter.endDate;
      delete filter.startDate;
    }

    if (reportMode === ReportMode.date) {
      delete filter.endDate;
      delete filter.startDate;
    }

    if (reportMode === ReportMode.dateRange) {
      delete filter.date;
    }

    return filter;
  }

  private cloneDate(
    date: Date | null | undefined,
  ): Date | null {
    return date ? new Date(date.getTime()) : null;
  }

  private normalizeStartOfDay(
    date: Date | null,
  ): Date | null {
    return date ? this.reportDateCalendarService.startOfReportDate(date) : null;
  }

  private normalizeEndOfDay(
    date: Date | null,
  ): Date | null {
    return date ? this.reportDateCalendarService.endOfReportDate(date) : null;
  }
}
