import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  injectAsync,
  input,
  type InputSignal,
  output,
  OutputEmitterRef,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { take } from 'rxjs';

import { Settings } from '@core/services/settings';

import { Tag } from '@shared/models/tag.model';
import { Task as TaskModel } from '@shared/models/task.model';
import { ReadableTime } from '@shared/pipes/readable-time';
import type { AreYouSure } from '@shared/services/are-you-sure';
import { Tags } from '@shared/services/tags';
import { Tasks } from '@shared/services/tasks';
import type { AsyncLoader } from '@shared/types/async-loader.type';

import type { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';
import { TaskFormSession } from '@tasks/services/task-form-session';
import type { TimeLogList } from '@tasks/services/time-log-list';

import { JiraApiSettingsAdapter } from '@settings/adapters/jira-api-settings.adapter';

@Component({
  selector: 'tasks-task',
  templateUrl: './task.html',
  styleUrls: ['./task.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    ReadableTime,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    FormField,
    NgClass,
  ],
})
export class Task {
  public readonly task: InputSignal<TaskModel> = input.required<TaskModel>();
  public readonly isLoading: InputSignal<boolean> = input.required<boolean>();

  protected readonly action: OutputEmitterRef<TaskModel> = output<TaskModel>();
  protected readonly update: OutputEmitterRef<TaskModel> = output<TaskModel>();
  protected readonly remove: OutputEmitterRef<TaskModel> = output<TaskModel>();
  protected readonly timeLogsSaved: OutputEmitterRef<void> = output<void>();
  protected readonly editMode: WritableSignal<boolean> = signal(false);
  protected readonly currentTime: WritableSignal<number> = signal(Date.now());

  private readonly loadAreYouSureService: AsyncLoader<AreYouSure> = injectAsync(
    () => import('@shared/services/are-you-sure').then((m) => m.AreYouSure),
  );

  private readonly tagsService: Tags = inject(Tags);
  private readonly loadTimeLogListService: AsyncLoader<TimeLogList> = injectAsync(
    () => import('@tasks/services/time-log-list').then((m) => m.TimeLogList),
  );
  private readonly tasksService: Tasks = inject(Tasks);
  private readonly settingsService: Settings = inject(Settings);
  private readonly jiraApiSettingsAdapter: JiraApiSettingsAdapter = inject(JiraApiSettingsAdapter);

  protected readonly taskFormSession: TaskFormSession = TaskFormSession.edit(
    this.task,
    (taskName: string) => this.tasksService.taskExist(taskName),
  );
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;
  protected readonly jiraIssueUrl: Signal<string | null> = computed(() => {
    if (
      this.editMode()
      || !this.jiraApiSettingsAdapter.isEnabled(this.settingsService.settings())
    ) {
      return null;
    }

    const host: string = this.jiraApiSettingsAdapter.toFormValue(this.settingsService.settings()).host
      .trim()
      .replace(/\/+$/, '');
    const issueKey: string = this.task().name.split('-#-', 2)[0].trim().toUpperCase();

    return this.isHttpHost(host) && /^[A-Z][A-Z0-9_]*-\d+$/.test(issueKey)
      ? `${ host }/browse/${ encodeURIComponent(issueKey) }`
      : null;
  });

  constructor() {
    effect(() => {
      if (!this.editMode()) {
        this.taskFormSession.reset();
      }
    });

    effect((onCleanup) => {
      if (!this.isTimeLogRunning()) {
        return;
      }

      const intervalId: ReturnType<typeof setInterval> = setInterval(
        () => this.currentTime.set(Date.now()),
        10000,
      );

      onCleanup(() => clearInterval(intervalId));
    });
  }

  protected isSameTag(
    tag1: Tag,
    tag2: Tag,
  ): boolean {
    return tag1.id === tag2.id;
  }

  protected isTimeLogRunning(): boolean {
    return this.task().isTimeLogRunning;
  }

  private isHttpHost(
    host: string,
  ): boolean {
    try {
      return ['http:', 'https:'].includes(new URL(host).protocol);
    } catch {
      return false;
    }
  }

  protected getCardClassMap(): Record<string, boolean> {
    return {
      'task-card-editing': this.editMode(),
      'task-card--started': this.isTimeLogRunning() && !this.editMode(),
    };
  }

  protected getViewModeDisplay(): string {
    return this.editMode() ?
      'none' :
      '';
  }

  protected getEditModeDisplay(): string {
    return this.editMode() ?
      '' :
      'none';
  }

  protected hasNameError(): boolean {
    return this.taskFormSession.form.name().touched() && this.taskFormSession.form.name().invalid();
  }

  protected getTaskDescription(): string {
    return this.task().description ?? '';
  }

  protected getTotalTimeWorked(): number {
    if (!this.isTimeLogRunning()) {
      return this.task().timeLogged;
    }

    this.currentTime();

    return this.task().calcTimeLogged();
  }

  protected isViewActionDisabled(): boolean {
    return this.isLoading() || this.editMode();
  }

  protected isRemoveDisabled(): boolean {
    return this.isLoading() || this.editMode();
  }

  protected isSaveDisabled(): boolean {
    return this.isLoading() || this.taskFormSession.form().invalid() || !this.taskFormSession.form().dirty();
  }

  protected getEditButtonIcon(): string {
    return this.editMode() ?
      'cancel' :
      'edit';
  }

  protected getEditButtonLabel(): string {
    return this.editMode() ?
      'Cancel editing' :
      'Edit task';
  }

  protected getTimerActionIcon(): string {
    return this.isTimeLogRunning() ?
      'pause' :
      'play_arrow';
  }

  protected getTimerActionLabel(): string {
    return this.isTimeLogRunning() ?
      'Stop timer' :
      'Start timer';
  }

  protected onTagsChange(tags: Tag[]): void {
    this.taskFormSession.setTags(tags);
  }

  protected onUpdate(event?: Event): void {
    event?.preventDefault?.();

    if (!this.taskFormSession.form().valid()) {
      this.taskFormSession.form().markAsTouched();
      return;
    }

    this.update.emit(this.taskFormSession.toTask());
    this.editMode.set(false);
  }

  protected async onRemove(): Promise<void> {
    const areYouSureService: AreYouSure = await this.loadAreYouSureService();

    areYouSureService.openDialog(`Task "${ this.task().name }"`)
      .pipe(take(1))
      .subscribe((response: boolean | undefined) => {
        if (response === true) {
          this.remove.emit(this.task());
        }
      });
  }

  protected onToggleEditMode(): void {
    const nextEditMode: boolean = !this.editMode();
    this.editMode.set(nextEditMode);

    if (nextEditMode) {
      this.taskFormSession.reset();
    }
  }

  protected onToggleTimeLogging(): void {
    this.action.emit(this.task());
  }

  protected async onOpenTimeLogsModal(): Promise<void> {
    const timeLogListService: TimeLogList = await this.loadTimeLogListService();

    timeLogListService.openTimeLogsListDialog(this.task())
      .pipe(take(1))
      .subscribe((response: TimeLogsModalResponse | undefined) => {
        if (response?.saved) {
          this.timeLogsSaved.emit();
        }
      });
  }

}
