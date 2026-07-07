import { Tag } from '@shared/models/tag.model';

import type { ImportWarning, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { ImportTagInput, ImportTaskInput } from '@tasks/interfaces/import-task-input.interface';
import type { TaskBackupLegacyTagInput, TaskBackupLegacyTaskInput } from '@tasks/interfaces/task-backup-legacy-input.interface';
import type { TaskBackupImportMetadata } from '@tasks/services/task-backup-unsupported-metadata.service';
import { normalizeBackupKey } from '@tasks/utilities/task-backup-normalization.utility';

type ReadImportMetadata = (task: TaskBackupLegacyTaskInput, name: string) => TaskBackupImportMetadata;

export const adaptTaskImportRequest: (
  input: unknown,
  currentTags: Tag[],
  readImportMetadata: ReadImportMetadata,
) => TaskImportRequest = (
  input: unknown,
  currentTags: Tag[],
  readImportMetadata: ReadImportMetadata,
): TaskImportRequest => {
  const taskInputs: unknown[] = normalizeImportTasks(input);
  const warnings: ImportWarning[] = [];
  const tasks: ImportTaskInput[] = taskInputs.map((taskInput: unknown) => normalizeTaskInput(
    taskInput,
    currentTags,
    warnings,
    readImportMetadata,
  ));
  const importedDuplicates: string[] = collectDuplicateBackupNames(tasks.map((task: ImportTaskInput) => task.name));

  if (importedDuplicates.length > 0) {
    throw new Error(`Import contains duplicate task names: ${ importedDuplicates.join(', ') }.`);
  }

  return {
    tasks,
    warnings,
  };
};

const normalizeImportTasks: (input: unknown) => unknown[] = (
  input: unknown,
): unknown[] => {
  if (Array.isArray(input)) {
    return input;
  }

  if (isBackupRecord(input) && input['version'] === 2 && Array.isArray(input['tasks'])) {
    return input['tasks'];
  }

  throw new Error('Unsupported task backup format.');
};

const normalizeTaskInput: (
  value: unknown,
  currentTags: Tag[],
  warnings: ImportWarning[],
  readImportMetadata: ReadImportMetadata,
) => ImportTaskInput = (
  value: unknown,
  currentTags: Tag[],
  warnings: ImportWarning[],
  readImportMetadata: ReadImportMetadata,
): ImportTaskInput => {
  if (!isBackupRecord(value)) {
    throw new Error('Imported task must be an object.');
  }

  const task: TaskBackupLegacyTaskInput = value as TaskBackupLegacyTaskInput;
  const name: string = normalizeRequiredBackupText(
    [task.name, task._name],
    'name',
  );
  const description: string | undefined = normalizeOptionalBackupText(
    task.description,
    task._description,
  );
  const rawTags: unknown[] = pickBackupArray(task, 'tags', '_tags');
  const tags: ImportTagInput[] = dedupeTagInputs(rawTags.map((tag: unknown) => normalizeTagInput(tag, currentTags)));
  const metadata: TaskBackupImportMetadata = readImportMetadata(task, name);

  if (metadata.warning) {
    warnings.push(metadata.warning);
  }

  return {
    name,
    description,
    tags,
    timeLogs: metadata.timeLogs,
    unsupportedMetadata: metadata.unsupportedMetadata,
  };
};

const normalizeTagInput: (value: unknown, currentTags: Tag[]) => ImportTagInput = (
  value: unknown,
  currentTags: Tag[],
): ImportTagInput => {
  if (typeof value === 'string' && value.trim()) {
    const normalizedName: string = normalizeBackupKey(value);
    const existingTag: Tag | undefined = currentTags.find((tag: Tag) => normalizeBackupKey(tag.name) === normalizedName);

    return existingTag ?
      {
        name: existingTag.name,
        existingTagId: existingTag.id,
      } :
      { name: value.trim() };
  }

  if (!isBackupRecord(value)) {
    throw new Error('Imported tag reference must be a string or object.');
  }

  const tagRef: TaskBackupLegacyTagInput = value as TaskBackupLegacyTagInput;
  const existingTag: Tag | undefined = findMatchingTag(tagRef, currentTags);

  if (existingTag) {
    return {
      name: existingTag.name,
      existingTagId: existingTag.id,
    };
  }

  const name: string | undefined = normalizeOptionalBackupText(tagRef.name, tagRef._name)?.trim();

  if (!name) {
    throw new Error('Imported tag reference must include a name when the tag does not exist locally.');
  }

  return { name };
};

const findMatchingTag: (tagRef: TaskBackupLegacyTagInput, currentTags: Tag[]) => Tag | undefined = (
  tagRef: TaskBackupLegacyTagInput,
  currentTags: Tag[],
): Tag | undefined => {
  const id: string | undefined = typeof tagRef.id === 'string' ? tagRef.id : tagRef._id;
  const name: string | undefined = normalizeOptionalBackupText(tagRef.name, tagRef._name)?.trim();

  return currentTags.find((tag: Tag) =>
    (id && tag.id === id) ||
    (name && normalizeBackupKey(tag.name) === normalizeBackupKey(name)));
};

const dedupeTagInputs: (tags: ImportTagInput[]) => ImportTagInput[] = (
  tags: ImportTagInput[],
): ImportTagInput[] => {
  const seen: Set<string> = new Set<string>();

  return tags.filter((tag: ImportTagInput) => {
    const normalizedName: string = normalizeBackupKey(tag.name);

    if (seen.has(normalizedName)) {
      return false;
    }

    seen.add(normalizedName);
    return true;
  });
};

const isBackupRecord: (value: unknown) => value is Record<string, unknown> = (
  value: unknown,
): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const pickBackupArray: (
  value: TaskBackupLegacyTaskInput,
  current: keyof TaskBackupLegacyTaskInput,
  legacy: keyof TaskBackupLegacyTaskInput,
) => unknown[] = (
  value: TaskBackupLegacyTaskInput,
  current: keyof TaskBackupLegacyTaskInput,
  legacy: keyof TaskBackupLegacyTaskInput,
): unknown[] => {
  const output: unknown = value[current] ?? value[legacy];

  if (!Array.isArray(output)) {
    throw new Error(`Missing required field "${ String(current) }" for imported task.`);
  }

  return output;
};

const normalizeRequiredBackupText: (values: unknown[], field: string) => string = (
  values: unknown[],
  field: string,
): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  throw new Error(`Missing required field "${ field }" for imported task.`);
};

const normalizeOptionalBackupText: (...values: unknown[]) => string | undefined = (
  ...values: unknown[]
): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      return value;
    }

    if (value === null) {
      return undefined;
    }
  }

  return undefined;
};

const collectDuplicateBackupNames: (names: string[]) => string[] = (
  names: string[],
): string[] => {
  const seen: Set<string> = new Set<string>();
  const duplicates: Set<string> = new Set<string>();

  names.forEach((name: string) => {
    const normalizedName: string = normalizeBackupKey(name);

    if (seen.has(normalizedName)) {
      duplicates.add(name);
      return;
    }

    seen.add(normalizedName);
  });

  return [...duplicates];
};
