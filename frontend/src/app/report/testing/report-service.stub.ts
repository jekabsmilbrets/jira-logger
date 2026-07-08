import { type Signal, signal, type WritableSignal } from '@angular/core';

import { vi } from 'vitest';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import type { ReportViewState } from '@report/interfaces/report-view-state.interface';

const defaultSettingsControlsState: ReportSettingsControlsState = {
  reportMode: ReportMode.total,
  tags: [],
  date: null,
  startDate: null,
  endDate: null,
  showWeekends: false,
  hideUnreportedTasks: false,
  showDatePicker: false,
};

const defaultViewState: ReportViewState = {
  tasks: [],
  columns: [],
  reportDate: null,
  canSyncJiraWorkLogs: false,
};

export class ReportServiceStub {
  public readonly settingsControlsState: Signal<ReportSettingsControlsState>;
  public readonly viewState: Signal<ReportViewState>;
  public readonly reload: ReturnType<typeof vi.fn>;
  public readonly applyRouteParams: ReturnType<typeof vi.fn>;
  public readonly applySettingsIntent: ReturnType<typeof vi.fn>;

  private readonly settingsControlsStateSignal: WritableSignal<ReportSettingsControlsState>;
  private readonly viewStateSignal: WritableSignal<ReportViewState>;

  public constructor(private readonly options: ReportServiceStubOptions = {}) {
    this.settingsControlsStateSignal = signal<ReportSettingsControlsState>({
      ...defaultSettingsControlsState,
      ...options.settingsControlsState,
    });
    this.viewStateSignal = signal<ReportViewState>({
      ...defaultViewState,
      ...options.viewState,
    });
    this.settingsControlsState = this.settingsControlsStateSignal.asReadonly();
    this.viewState = this.viewStateSignal.asReadonly();
    this.reload = options.reload ?? vi.fn();
    this.applyRouteParams = vi.fn();
    this.applySettingsIntent = vi.fn((intent: ReportSettingsIntent) => {
      this.options.onApplySettingsIntent?.(intent);
    });
  }

  public setSettingsControlsState(state: Partial<ReportSettingsControlsState>): void {
    this.settingsControlsStateSignal.update((current: ReportSettingsControlsState) => ({
      ...current,
      ...state,
    }));
  }

  public setViewState(state: Partial<ReportViewState>): void {
    this.viewStateSignal.update((current: ReportViewState) => ({
      ...current,
      ...state,
    }));
  }
}

interface ReportServiceStubOptions {
  settingsControlsState?: Partial<ReportSettingsControlsState>;
  viewState?: Partial<ReportViewState>;
  reload?: ReturnType<typeof vi.fn>;
  onApplySettingsIntent?: (intent: ReportSettingsIntent) => void;
}
