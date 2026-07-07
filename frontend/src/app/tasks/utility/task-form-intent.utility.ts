import type { ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { catchError, map, type Observable, of } from 'rxjs';

import { Task } from '@shared/models/task.model';

import type { TaskFormValue } from '@tasks/interfaces/task-form-value.interface';

type TaskFormPayload = Partial<{
  [Key in keyof TaskFormValue]: TaskFormValue[Key] | null;
}>;
type TaskNameCheck = (name: string) => Observable<unknown>;

interface DuplicateTaskNameError {
  kind: 'duplicate-task';
  message: 'Task already exists.';
}

interface TaskTagsField {
  value: { set: (tags: TaskFormValue['tags']) => void };
  markAsDirty: () => void;
  markAsTouched: (options: { skipDescendants: true }) => void;
}

export function buildEmptyTaskFormValue(): TaskFormValue {
  return {
    name: '',
    description: '',
    tags: [],
  };
}

export function buildTaskFormValue(
  task: Task,
): TaskFormValue {
  return {
    name: task.name,
    description: task.description ?? '',
    tags: [...task.tags],
  };
}

export function isDuplicateTaskName(
  tasks: Task[],
  name: string,
  sourceTask?: Task,
): boolean {
  return tasks.some((task: Task) => task.id !== sourceTask?.id && task.name === name);
}

export function normalizeTaskNameForDuplicateCheck(
  name: string,
): string | undefined {
  const trimmedName: string = name.trim();

  return trimmedName || undefined;
}

export function buildDuplicateTaskNameError(
  isDuplicate: boolean | undefined,
): DuplicateTaskNameError | null {
  return isDuplicate ? {
    kind: 'duplicate-task',
    message: 'Task already exists.',
  } : null;
}

export function createDuplicateTaskNameValidator(
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

export function buildTaskCreatePayload(
  formData: TaskFormValue,
): Task {
  return new Task(formData as Partial<Task>);
}

export function setTaskFormTags(
  field: TaskTagsField,
  tags: TaskFormValue['tags'],
): void {
  field.value.set(tags);
  field.markAsDirty();
  field.markAsTouched({ skipDescendants: true });
}

export function buildTaskUpdatePayload(
  sourceTask: Task,
  formData: TaskFormPayload,
): Task {
  return new Task({
    ...sourceTask,
    name: typeof formData.name === 'string' ? formData.name : sourceTask.name,
    description: typeof formData.description === 'string' ? formData.description : sourceTask.description,
    tags: Array.isArray(formData.tags) ? [...formData.tags] : sourceTask.tags,
    timeLogs: [...sourceTask.timeLogs],
    jiraWorkLogs: [...sourceTask.jiraWorkLogs],
  });
}
