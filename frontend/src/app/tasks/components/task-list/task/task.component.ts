import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  injectAsync,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { type FieldTree, form, FormField, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { take } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import type { AreYouSureService } from '@shared/services/are-you-sure.service';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import type { AsyncLoader } from '@shared/types/async-loader.type';

import { TaskUpdateAction } from '@tasks/enums/task-update-action.enum';
import type { TaskFormValue } from '@tasks/interfaces/task-form-value.interface';
import type { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';
import type { TimeLogListService } from '@tasks/services/time-log-list.service';
import { buildTaskUpdatePayload } from '@tasks/utility/task-payload-builder.utility';

@Component({
  selector: 'tasks-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    ReadableTimePipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    FormField,
    NgClass,
  ],
})
export class TaskComponent {
  public readonly task: InputSignal<Task> = input.required<Task>();
  public readonly isLoading: InputSignal<boolean> = input.required<boolean>();

  protected readonly action: OutputEmitterRef<[Task, TaskUpdateAction]> = output<[
    Task,
    TaskUpdateAction
  ]>();
  protected readonly update: OutputEmitterRef<Task> = output<Task>();
  protected readonly remove: OutputEmitterRef<Task> = output<Task>();
  protected readonly timeLogsSaved: OutputEmitterRef<void> = output<void>();
  protected readonly taskFormModel: WritableSignal<TaskFormValue> = signal<TaskFormValue>({
    name: '',
    description: '',
    tags: [],
  });
  protected readonly editMode: WritableSignal<boolean> = signal(false);

  private readonly loadAreYouSureService: AsyncLoader<AreYouSureService> = injectAsync(
    () => import('@shared/services/are-you-sure.service').then((m) => m.AreYouSureService),
  );

  private readonly tagsService: TagsService = inject(TagsService);
  private readonly loadTimeLogListService: AsyncLoader<TimeLogListService> = injectAsync(
    () => import('@tasks/services/time-log-list.service').then((m) => m.TimeLogListService),
  );
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly tasks: Signal<Task[]> = this.tasksService.tasks;

  protected readonly taskForm: FieldTree<TaskFormValue> = form(this.taskFormModel, (path) => {
    required(path.name, { message: 'Task name is required.' });
    validate(path.name, ({ value }) => {
      const name: string = value().trim();

      if (!name) {
        return null;
      }

      return this.tasks().some((task) => task.id !== this.task().id && task.name === name) ?
        {
          kind: 'duplicate-task',
          message: 'Task already exists.',
        } :
        null;
    });
  });
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;

  constructor() {
    effect(() => {
      if (!this.editMode()) {
        this.taskForm().reset(this.buildFormValue(this.task()));
      }
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
    return this.taskForm.name().touched() && this.taskForm.name().invalid();
  }

  protected getTaskDescription(): string {
    return this.task().description ?? '';
  }

  protected isViewActionDisabled(): boolean {
    return this.isLoading() || this.editMode();
  }

  protected isRemoveDisabled(): boolean {
    return this.isLoading() || this.editMode();
  }

  protected isSaveDisabled(): boolean {
    return this.isLoading() || this.taskForm().invalid() || !this.taskForm().dirty();
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
    const field: ReturnType<typeof this.taskForm.tags> = this.taskForm.tags();
    field.value.set(tags);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
  }

  protected onUpdate(event?: Event): void {
    event?.preventDefault?.();

    if (!this.taskForm().valid()) {
      this.taskForm().markAsTouched();
      return;
    }

    const taskPayload: Task = buildTaskUpdatePayload(this.task(), this.taskFormModel());
    taskPayload.updateTimeLogged();
    this.update.emit(taskPayload);
    this.editMode.set(false);
  }

  protected async onRemove(): Promise<void> {
    const areYouSureService: AreYouSureService = await this.loadAreYouSureService();

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
      this.taskForm().reset(this.buildFormValue(this.task()));
    }
  }

  protected onToggleTimeLogging(): void {
    const action: TaskUpdateAction = this.isTimeLogRunning() ?
      TaskUpdateAction.stopWorkLog :
      TaskUpdateAction.startWorkLog;

    this.action.emit([
      this.task(),
      action,
    ]);
  }

  protected async onOpenTimeLogsModal(): Promise<void> {
    const timeLogListService: TimeLogListService = await this.loadTimeLogListService();

    timeLogListService.openTimeLogsListDialog(this.task())
      .pipe(take(1))
      .subscribe((response: TimeLogsModalResponse | undefined) => {
        if (response?.saved) {
          this.timeLogsSaved.emit();
        }
      });
  }

  private buildFormValue(task: Task): TaskFormValue {
    return {
      name: task.name,
      description: task.description ?? '',
      tags: [...task.tags],
    };
  }
}
