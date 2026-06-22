import { type Signal, signal, type WritableSignal } from '@angular/core';

import { vi } from 'vitest';

import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportServiceStubOptions } from '@report/interfaces/report-service-stub-options.interface';

const defaultReportServiceStubState: Omit<ReportServiceStubState, 'reload'> = {
  reportMode: ReportMode.total,
  tags: [],
  date: null,
  startDate: null,
  endDate: null,
  showWeekends: false,
  hideUnreportedTasks: false,
  tasks: [],
  columns: [],
};

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
    const initialState: ReportServiceStubState = {
      ...defaultReportServiceStubState,
      ...options,
      reload: options.reload ?? vi.fn(),
    };

    this.reportModeSignal = signal<ReportMode>(initialState.reportMode);
    this.tagsSignal = signal<Tag[]>(initialState.tags);
    this.dateSignal = signal<Date | null>(initialState.date);
    this.startDateSignal = signal<Date | null>(initialState.startDate);
    this.endDateSignal = signal<Date | null>(initialState.endDate);
    this.showWeekendsSignal = signal<boolean>(initialState.showWeekends);
    this.hideUnreportedTasksSignal = signal<boolean>(initialState.hideUnreportedTasks);
    this.tasksSignal = signal<Task[]>(initialState.tasks);
    this.columnsSignal = signal<Column[]>(initialState.columns);

    this.reportMode = this.reportModeSignal.asReadonly();
    this.tags = this.tagsSignal.asReadonly();
    this.date = this.dateSignal.asReadonly();
    this.startDate = this.startDateSignal.asReadonly();
    this.endDate = this.endDateSignal.asReadonly();
    this.showWeekends = this.showWeekendsSignal.asReadonly();
    this.hideUnreportedTasks = this.hideUnreportedTasksSignal.asReadonly();
    this.tasks = this.tasksSignal.asReadonly();
    this.columns = this.columnsSignal.asReadonly();
    this.reload = initialState.reload;
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

interface ReportServiceStubState {
  reportMode: ReportMode;
  tags: Tag[];
  date: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  showWeekends: boolean;
  hideUnreportedTasks: boolean;
  tasks: Task[];
  columns: Column[];
  reload: ReturnType<typeof vi.fn>;
}
