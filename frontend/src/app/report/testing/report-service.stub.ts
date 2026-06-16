import { type Signal, signal, type WritableSignal } from '@angular/core';

import { vi } from 'vitest';

import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportServiceStubOptions } from '@report/interfaces/report-service-stub-options.interface';

export class ReportServiceStub {
  public readonly reportMode: Signal<ReportMode>;
  public readonly tags: Signal<Tag[]>;
  public readonly date: Signal<Date | null>;
  public readonly startDate: Signal<Date | null>;
  public readonly endDate: Signal<Date | null>;
  public readonly showWeekends: Signal<boolean>;
  public readonly hideUnreportedTasks: Signal<boolean>;
  public readonly tasks: Signal<Task[]>;
  public readonly columns: Signal<Column[]>;
  public readonly reload: ReturnType<typeof vi.fn>;

  private readonly reportModeSignal: WritableSignal<ReportMode>;
  private readonly tagsSignal: WritableSignal<Tag[]>;
  private readonly dateSignal: WritableSignal<Date | null>;
  private readonly startDateSignal: WritableSignal<Date | null>;
  private readonly endDateSignal: WritableSignal<Date | null>;
  private readonly showWeekendsSignal: WritableSignal<boolean>;
  private readonly hideUnreportedTasksSignal: WritableSignal<boolean>;
  private readonly tasksSignal: WritableSignal<Task[]>;
  private readonly columnsSignal: WritableSignal<Column[]>;

  public constructor(private readonly options: ReportServiceStubOptions = {}) {
    this.reportModeSignal = signal<ReportMode>(options.reportMode ?? ReportMode.total);
    this.tagsSignal = signal<Tag[]>(options.tags ?? []);
    this.dateSignal = signal<Date | null>(options.date ?? null);
    this.startDateSignal = signal<Date | null>(options.startDate ?? null);
    this.endDateSignal = signal<Date | null>(options.endDate ?? null);
    this.showWeekendsSignal = signal<boolean>(options.showWeekends ?? false);
    this.hideUnreportedTasksSignal = signal<boolean>(options.hideUnreportedTasks ?? false);
    this.tasksSignal = signal<Task[]>(options.tasks ?? []);
    this.columnsSignal = signal<Column[]>(options.columns ?? []);

    this.reportMode = this.reportModeSignal.asReadonly();
    this.tags = this.tagsSignal.asReadonly();
    this.date = this.dateSignal.asReadonly();
    this.startDate = this.startDateSignal.asReadonly();
    this.endDate = this.endDateSignal.asReadonly();
    this.showWeekends = this.showWeekendsSignal.asReadonly();
    this.hideUnreportedTasks = this.hideUnreportedTasksSignal.asReadonly();
    this.tasks = this.tasksSignal.asReadonly();
    this.columns = this.columnsSignal.asReadonly();
    this.reload = options.reload ?? vi.fn();
  }

  public setReportMode(value: ReportMode): void {
    this.options.onSetReportMode?.(value);
    this.reportModeSignal.set(value);
  }

  public setTags(value: Tag[]): void {
    this.options.onSetTags?.(value);
    this.tagsSignal.set(value);
  }

  public setDate(value: Date | null): void {
    this.options.onSetDate?.(value);
    this.dateSignal.set(value);
  }

  public setStartDate(value: Date | null): void {
    this.options.onSetStartDate?.(value);
    this.startDateSignal.set(value);
  }

  public setEndDate(value: Date | null): void {
    this.options.onSetEndDate?.(value);
    this.endDateSignal.set(value);
  }

  public setShowWeekends(value: boolean): void {
    this.options.onSetShowWeekends?.(value);
    this.showWeekendsSignal.set(value);
  }

  public setHideUnreportedTasks(value: boolean): void {
    this.options.onSetHideUnreportedTasks?.(value);
    this.hideUnreportedTasksSignal.set(value);
  }
}
