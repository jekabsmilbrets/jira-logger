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
import { form, FormField, required, validate } from '@angular/forms/signals';
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

import { TaskUpdateAction } from '@tasks/enums/task-update-action.enum';
import { TaskFormValue } from '@tasks/interfaces/task-form-value.interface';
import { TimeLogsModalResponse } from '@tasks/interfaces/time-logs-modal-response.interface';
import type { TimeLogEditService } from '@tasks/services/time-log-edit.service';
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

  private readonly loadAreYouSureService = injectAsync(
    () => import('@shared/services/are-you-sure.service').then((m) => m.AreYouSureService),
  );

  private readonly tagsService: TagsService = inject(TagsService);
  private readonly loadTimeLogEditService = injectAsync(
    () => import('@tasks/services/time-log-edit.service').then((m) => m.TimeLogEditService),
  );
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly tasks: Signal<Task[]> = this.tasksService.tasks;

  protected readonly taskForm = form(this.taskFormModel, (path) => {
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
    const timeLogEditService: TimeLogEditService = await this.loadTimeLogEditService();

    timeLogEditService.openTimeLogsListDialog(this.task())
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
