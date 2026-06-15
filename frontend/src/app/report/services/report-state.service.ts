import { effect, inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, of, take, tap } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsStorageValue } from '@report/interfaces/report-settings-storage-value.interface';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';

@Service()
export class ReportStateService {
  private readonly storageService: StorageService = inject(StorageService);
  private readonly tagsService: TagsService = inject(TagsService);

  private readonly reportModeSignal: WritableSignal<ReportMode> = signal<ReportMode>(ReportMode.total);
  private readonly tagsSignal: WritableSignal<Tag[]> = signal<Tag[]>([]);
  private readonly dateSignal: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly startDateSignal: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly endDateSignal: WritableSignal<Date | null> = signal<Date | null>(null);
  private readonly showWeekendsSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly hideUnreportedTasksSignal: WritableSignal<boolean> = signal<boolean>(false);

  private readonly settingsKey: IDBValidKey = 'report';
  private readonly customStoreName: string = 'settings';

  public readonly reportMode: Signal<ReportMode> = this.reportModeSignal.asReadonly();
  public readonly tags: Signal<Tag[]> = this.tagsSignal.asReadonly();
  public readonly date: Signal<Date | null> = this.dateSignal.asReadonly();
  public readonly startDate: Signal<Date | null> = this.startDateSignal.asReadonly();
  public readonly endDate: Signal<Date | null> = this.endDateSignal.asReadonly();
  public readonly showWeekends: Signal<boolean> = this.showWeekendsSignal.asReadonly();
  public readonly hideUnreportedTasks: Signal<boolean> = this.hideUnreportedTasksSignal.asReadonly();

  public constructor() {
    this.initSettings();
    this.registerSettingsPersistence();
  }

  public setReportMode(
    mode: ReportMode,
  ): void {
    this.reportModeSignal.set(mode);
  }

  public setTags(
    tags: Tag[],
  ): void {
    this.tagsSignal.set([...(tags ?? [])]);
  }

  public setDate(
    date: Date | null,
  ): void {
    this.dateSignal.set(this.normalizeStartOfDay(date));
  }

  public setStartDate(
    startDate: Date | null,
  ): void {
    this.startDateSignal.set(this.normalizeStartOfDay(startDate));
  }

  public setEndDate(
    endDate: Date | null,
  ): void {
    this.endDateSignal.set(this.normalizeEndOfDay(endDate));
  }

  public setShowWeekends(
    showWeekends: boolean,
  ): void {
    this.showWeekendsSignal.set(showWeekends);
  }

  public setHideUnreportedTasks(
    hideUnreportedTasks: boolean,
  ): void {
    this.hideUnreportedTasksSignal.set(hideUnreportedTasks);
  }

  public getStateSnapshot(): ReportStateSnapshot {
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

  public getEffectiveReportMode(
    reportMode: ReportMode,
    date: Date | null,
    startDate: Date | null,
    endDate: Date | null,
  ): ReportMode {
    if (reportMode === ReportMode.date && !date) {
      return ReportMode.total;
    }

    if (reportMode === ReportMode.dateRange && (!startDate || !endDate)) {
      return ReportMode.total;
    }

    return reportMode;
  }

  private registerSettingsPersistence(): void {
    effect((onCleanup) => {
      const state: ReportStateSnapshot = this.getStateSnapshot();
      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
        this.storageService.create(
          this.settingsKey,
          {
            reportMode: state.reportMode,
            tags: state.tags.map((tag: Tag) => tag.id),
            date: state.date,
            startDate: state.startDate,
            endDate: state.endDate,
            showWeekends: state.showWeekends,
            hideUnreportedTasks: state.hideUnreportedTasks,
          },
          this.customStoreName,
        )
          .pipe(
            take(1),
            catchError(() => of(undefined)),
          )
          .subscribe();
      }, 250);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  private initSettings(): void {
    this.storageService.read<ReportSettingsStorageValue | undefined>(
      this.settingsKey,
      this.customStoreName,
    )
      .pipe(
        take(1),
        tap((settings: ReportSettingsStorageValue | undefined) => {
          const availableTags: Tag[] | {
            filter?: (callback: (tag: Tag) => boolean) => Tag[] | undefined
          } = this.tagsService.tags() as Tag[];
          const selectedTagIds: string[] = settings?.tags ?? [];
          const selectedTags: Tag[] = availableTags && typeof availableTags === 'object' && 'filter' in availableTags ?
            availableTags.filter?.((tag: Tag) => selectedTagIds.includes(tag.id)) ?? [] :
            [];

          this.reportModeSignal.set(settings?.reportMode ?? ReportMode.total);
          this.tagsSignal.set(selectedTags);
          this.dateSignal.set(this.cloneDate(settings?.date));
          this.startDateSignal.set(this.cloneDate(settings?.startDate));
          this.endDateSignal.set(this.cloneDate(settings?.endDate));
          this.showWeekendsSignal.set(settings?.showWeekends ?? false);
          this.hideUnreportedTasksSignal.set(settings?.hideUnreportedTasks ?? false);
        }),
      )
      .subscribe();
  }

  private cloneDate(
    date: Date | null | undefined,
  ): Date | null {
    return date ? new Date(date.getTime()) : null;
  }

  private normalizeStartOfDay(
    date: Date | null,
  ): Date | null {
    const nextDate: Date | null = this.cloneDate(date);
    nextDate?.setHours(0, 0, 0, 0);

    return nextDate;
  }

  private normalizeEndOfDay(
    date: Date | null,
  ): Date | null {
    const nextDate: Date | null = this.cloneDate(date);
    nextDate?.setHours(23, 59, 59, 999);

    return nextDate;
  }
}
