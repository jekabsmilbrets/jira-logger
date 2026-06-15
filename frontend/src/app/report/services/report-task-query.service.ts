import { computed, inject, type ResourceRef, Service, type Signal, signal, type WritableSignal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { catchError, debounceTime, type Observable, of } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import { ReportStateService } from '@report/services/report-state.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

@Service()
export class ReportTaskQueryService {
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly reportStateService: ReportStateService = inject(ReportStateService);
  private readonly reloadVersionSignal: WritableSignal<number> = signal<number>(0);

  public readonly jiraApiEnabled: Signal<boolean> = computed(() => this.isJiraApiEnabled(this.settingsService.settings()));
  private readonly taskRequest: Signal<{
    state: ReportStateSnapshot;
    jiraApiEnabled: boolean;
    reloadVersion: number;
  }> = computed(() => ({
    state: this.reportStateService.getStateSnapshot(),
    jiraApiEnabled: this.jiraApiEnabled(),
    reloadVersion: this.reloadVersionSignal(),
  }));
  private readonly debouncedTaskRequest: Signal<{
    state: ReportStateSnapshot;
    jiraApiEnabled: boolean;
    reloadVersion: number;
  }> = toSignal(
    toObservable(this.taskRequest).pipe(debounceTime(250)),
    { initialValue: this.taskRequest() },
  );
  private readonly tasksResource: ResourceRef<Task[] | undefined> = rxResource({
    params: this.debouncedTaskRequest,
    stream: ({ params }) => this.filterTasks(
      params.state,
      params.jiraApiEnabled,
    )
      .pipe(
        catchError(() => of([])),
      ),
  });

  public readonly tasks: Signal<Task[]> = computed(() => this.tasksResource.value() ?? []);

  public reload(): void {
    this.reloadVersionSignal.update((value: number) => value + 1);
  }

  private filterTasks(
    state: ReportStateSnapshot,
    jiraApiEnabled: boolean,
  ): Observable<Task[]> {
    void jiraApiEnabled;

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

    const reportMode: ReportMode = this.reportStateService.getEffectiveReportMode(
      state.reportMode,
      state.date,
      state.startDate,
      state.endDate,
    );

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

    return this.tasksService.filteredList(
      filter,
      true,
    );
  }

  private isJiraApiEnabled(
    settings: Setting[],
  ): boolean {
    const jiraEnabledSetting: Setting | undefined = settings.find(
      (setting: Setting) => setting.name === JiraApiSettings.enabled,
    );

    if (!jiraEnabledSetting) {
      return false;
    }

    if (typeof jiraEnabledSetting.value === 'boolean') {
      return jiraEnabledSetting.value;
    }

    if (typeof jiraEnabledSetting.value === 'string') {
      return jiraEnabledSetting.value.toLowerCase() === 'true';
    }

    return false;
  }
}
