import { computed, inject, Service, Signal, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { catchError, debounceTime, Observable, of } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Task } from '@shared/models/task.model';
import { TasksService } from '@shared/services/tasks.service';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
import { ReportStateService } from '@report/services/report-state.service';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

@Service()
export class ReportTaskQueryService {
  private readonly settingsService: SettingsService = inject(SettingsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly reportStateService: ReportStateService = inject(ReportStateService);

  private readonly reloadVersionSignal = signal<number>(0);
  public readonly jiraApiEnabled: Signal<boolean> = computed(() => this.isJiraApiEnabled(this.settingsService.settings()));
  private readonly taskRequest = computed(() => ({
    state: this.reportStateService.getStateSnapshot(),
    jiraApiEnabled: this.jiraApiEnabled(),
    reloadVersion: this.reloadVersionSignal(),
  }));
  private readonly debouncedTaskRequest = toSignal(
    toObservable(this.taskRequest).pipe(debounceTime(250)),
    { initialValue: this.taskRequest() },
  );
  private readonly tasksResource = rxResource({
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

    const reportMode: ReportModeEnum = this.reportStateService.getEffectiveReportMode(
      state.reportMode,
      state.date,
      state.startDate,
      state.endDate,
    );

    if (reportMode === ReportModeEnum.total) {
      delete filter.date;
      delete filter.endDate;
      delete filter.startDate;
    }

    if (reportMode === ReportModeEnum.date) {
      delete filter.endDate;
      delete filter.startDate;
    }

    if (reportMode === ReportModeEnum.dateRange) {
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
