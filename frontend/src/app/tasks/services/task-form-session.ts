import { effect, type ResourceRef, type Signal, signal, type WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { type FieldTree, form, required, validateAsync } from '@angular/forms/signals';

import { catchError, map, type Observable, of } from 'rxjs';

import { Task } from '@shared/models/task.model';

import type { TaskDraft } from '@tasks/interfaces/task-draft.interface';

type TaskNameCheck = (name: string) => Observable<unknown>;

interface DuplicateTaskNameError {
  kind: 'duplicate-task';
  message: 'Task already exists.';
}

export class TaskFormSession {
  private readonly draftModel: WritableSignal<TaskDraft> = signal(this.emptyDraft());

  public readonly draft: Signal<TaskDraft> = this.draftModel.asReadonly();
  public readonly form: FieldTree<TaskDraft>;

  private constructor(
    private readonly sourceTask: Signal<Task> | undefined,
    checkName: TaskNameCheck,
  ) {
    this.form = form(this.draftModel, (path) => {
      required(path.name, { message: 'Task name is required.' });
      validateAsync(path.name, {
        params: ({ value }) => {
          const name: string | undefined = this.normalizeName(value());
          const sourceName: string | undefined = this.sourceTask ?
            this.normalizeName(this.sourceTask().name) :
            undefined;

          return name && name !== sourceName ? name : undefined;
        },
        debounce: this.sourceTask ? undefined : 300,
        factory: (name) => this.createNameValidator(name, checkName),
        onSuccess: (isDuplicate) => this.duplicateNameError(isDuplicate),
        onError: () => this.duplicateNameError(true),
      });
    });

    if (this.sourceTask) {
      let initialized: boolean = false;

      effect(() => {
        if (!initialized) {
          this.reset();
          initialized = true;
        }
      });
    }
  }

  public static create(checkName: TaskNameCheck): TaskFormSession {
    return new TaskFormSession(undefined, checkName);
  }

  public static edit(
    sourceTask: Signal<Task>,
    checkName: TaskNameCheck,
  ): TaskFormSession {
    return new TaskFormSession(sourceTask, checkName);
  }

  public reset(): void {
    this.form().reset(this.sourceTask ? this.draftFromTask(this.sourceTask()) : this.emptyDraft());
  }

  public setTags(tags: TaskDraft['tags']): void {
    this.form.tags().value.set(tags);
    this.form.tags().markAsDirty();
    this.form.tags().markAsTouched({ skipDescendants: true });
  }

  public toTask(): Task {
    const draft: TaskDraft = this.draft();

    if (!this.sourceTask) {
      return new Task({
        ...draft,
        tags: [...draft.tags],
      });
    }

    const sourceTask: Task = this.sourceTask();

    return new Task({
      ...sourceTask,
      ...draft,
      tags: [...draft.tags],
      timeLogs: [...sourceTask.timeLogs],
      jiraWorkLogs: [...sourceTask.jiraWorkLogs],
    });
  }

  private emptyDraft(): TaskDraft {
    return {
      name: '',
      description: '',
      tags: [],
    };
  }

  private draftFromTask(task: Task): TaskDraft {
    return {
      name: task.name,
      description: task.description ?? '',
      tags: [...task.tags],
    };
  }

  private normalizeName(name: string): string | undefined {
    const trimmedName: string = name.trim();

    return trimmedName || undefined;
  }

  private duplicateNameError(
    isDuplicate: boolean | undefined,
  ): DuplicateTaskNameError | null {
    return isDuplicate ? {
      kind: 'duplicate-task',
      message: 'Task already exists.',
    } : null;
  }

  private createNameValidator(
    name: Signal<string | undefined>,
    checkName: TaskNameCheck,
  ): ResourceRef<boolean | undefined> {
    return rxResource({
      params: name,
      stream: ({ params }) => {
        if (!params) {
          return of(false);
        }

        return checkName(params).pipe(
          map(() => false),
          catchError(() => of(true)),
        );
      },
    });
  }
}
