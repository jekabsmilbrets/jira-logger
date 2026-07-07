import { computed, inject, type ResourceRef, Service, type Signal, signal, type WritableSignal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { ParamMap } from '@angular/router';

import { catchError, debounceTime, of } from 'rxjs';

import { SettingsService } from '@core/services/settings.service';

import type { Column } from '@shared/interfaces/column.interface';
import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Task } from '@shared/models/task.model';
import { TaskQueryService } from '@shared/services/task-query.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import type { ReportViewState } from '@report/interfaces/report-view-state.interface';
import { ReportColumnsService } from '@report/services/report-columns.service';
import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';
import { ReportStateService } from '@report/services/report-state.service';

import { JiraApiSettingsAdapter } from '@settings/adapters/jira-api-settings.adapter';

@Service()
export class ReportService {
  private readonly reportStateService: ReportStateService = inject(ReportStateService);
  private readonly reportColumnsService: ReportColumnsService = inject(ReportColumnsService);
  private readonly reportDateCalendarService: ReportDateCalendarService = inject(ReportDateCalendarService);
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly taskQueryService: TaskQueryService = inject(TaskQueryService);
  private readonly jiraApiSettingsAdapter: JiraApiSettingsAdapter = inject(JiraApiSettingsAdapter);
  private readonly reloadVersionSignal: WritableSignal<number> = signal<number>(0);

  private readonly settings: Signal<ReportStateSnapshot> = this.reportStateService.snapshot;
  private readonly effectiveReportMode: Signal<ReportMode> = this.reportStateService.effectiveReportMode;
  private readonly showDatePicker: Signal<boolean> = this.reportStateService.showDatePicker;
  private readonly jiraApiEnabled: Signal<boolean> = computed(() => this.jiraApiSettingsAdapter.isEnabled(this.settingsService.settings()));
  private readonly taskRequest: Signal<{
    filter: TaskListFilter;
    reloadVersion: number;
  }> = computed(() => ({
    filter: this.reportStateService.taskFilter(),
    reloadVersion: this.reloadVersionSignal(),
  }));
  private readonly debouncedTaskRequest: Signal<{
    filter: TaskListFilter;
    reloadVersion: number;
  }> = toSignal(
    toObservable(this.taskRequest).pipe(debounceTime(250)),
    { initialValue: this.taskRequest() },
  );
  private readonly tasksResource: ResourceRef<Task[] | undefined> = rxResource({
    params: this.debouncedTaskRequest,
    stream: ({ params }) => this.taskQueryService.query(params.filter)
      .pipe(
        catchError(() => of([])),
      ),
  });
  private readonly tasks: Signal<Task[]> = computed(() => this.tasksResource.value() ?? []);
  private readonly columns: Signal<Column[]> = computed(() => {
    const state: ReportStateSnapshot = this.settings();

    return this.reportColumnsService.buildColumns(
      state,
      this.effectiveReportMode(),
      this.jiraApiEnabled(),
    );
  });
  public readonly settingsControlsState: Signal<ReportSettingsControlsState> = computed(() => {
    const settings: ReportStateSnapshot = this.settings();

    return {
      reportMode: settings.reportMode,
      tags: settings.tags,
      date: settings.date,
      startDate: settings.startDate,
      endDate: settings.endDate,
      showWeekends: settings.showWeekends,
      hideUnreportedTasks: settings.hideUnreportedTasks,
      showDatePicker: this.showDatePicker(),
    };
  });
  public readonly viewState: Signal<ReportViewState> = computed(() => {
    const settings: ReportStateSnapshot = this.settings();
    const effectiveReportMode: ReportMode = this.effectiveReportMode();

    return {
      tasks: this.tasks(),
      columns: this.columns(),
      reportDate: settings.date,
      canSyncJiraWorkLogs: effectiveReportMode === ReportMode.date,
    };
  });

  public reload(): void {
    this.reloadVersionSignal.update((value: number) => value + 1);
  }

  public applySettingsIntent(
    intent: ReportSettingsIntent,
  ): void {
    this.reportStateService.applySettingsIntent(intent);
  }

  public applyRouteParams(
    paramMap: ParamMap,
  ): void {
    if (!paramMap.has('reportMode')) {
      return;
    }

    const reportMode: ReportMode = paramMap.get('reportMode') as ReportMode;

    if (reportMode === ReportMode.date) {
      this.applyDateRouteParams(paramMap);
      return;
    }

    this.reportStateService.applyRouteSettings({
      reportMode: reportMode in ReportMode ? reportMode : ReportMode.total,
    });
  }

  private applyDateRouteParams(
    paramMap: ParamMap,
  ): void {
    const date: Date | null = paramMap.has('date') ?
      this.reportDateCalendarService.parseRouteDate(paramMap.get('date')) :
      this.reportDateCalendarService.todayReportDate();

    if (date) {
      this.reportStateService.applyRouteSettings({
        reportMode: ReportMode.date,
        date,
      });
    } else {
      this.reportStateService.applyRouteSettings({ reportMode: ReportMode.date });
    }
  }
}
