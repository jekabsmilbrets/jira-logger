import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import type { ImportWarning, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { ImportTaskInput, ImportTimeLogInput } from '@tasks/interfaces/import-task-input.interface';
import type {
  TaskBackupJiraWorkLog,
  TaskBackupSourceMetadataEntry,
  TaskBackupTagRef,
  TaskBackupTask,
  TaskBackupTimeLog,
  TaskBackupUnsupportedMetadata,
  TaskBackupV2,
} from '@tasks/interfaces/task-backup.interface';
import type {
  LegacyTagInput,
  LegacyTaskInput,
  LegacyTimeLogInput,
} from '@tasks/interfaces/task-backup-legacy-input.interface';

const normalizeKey: (value: string) => string = (value: string): string => value.trim().toLowerCase();

const isRecord: (value: unknown) => value is Record<string, unknown> = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readPrivateNumber: (
  value: Record<string, unknown>,
  key: string,
) => number | undefined = (
  value: Record<string, unknown>,
  key: string,
): number | undefined => {
  const output: unknown = value[key];

  return typeof output === 'number' && Number.isFinite(output) ?
    output :
    undefined;
};

const pickArray: (
  value: LegacyTaskInput,
  current: keyof LegacyTaskInput,
  legacy: keyof LegacyTaskInput,
) => unknown[] = (
  value: LegacyTaskInput,
  current: keyof LegacyTaskInput,
  legacy: keyof LegacyTaskInput,
): unknown[] => {
  const output: unknown = value[current] ?? value[legacy];

  if (!Array.isArray(output)) {
    throw new Error(`Missing required field "${ String(current) }" for imported task.`);
  }

  return output;
};

const normalizeTimestamp: (
  value: unknown,
  field: string,
) => number = (
  value: unknown,
  field: string,
): number => {
  if (value instanceof Date) {
    const output: number = value.getTime();

    if (Number.isFinite(output)) {
      return output;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numericValue: number = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    const parsedDate: number = Date.parse(value);

    if (Number.isFinite(parsedDate)) {
      return parsedDate;
    }
  }

  throw new Error(`Invalid timestamp for "${ field }".`);
};

const normalizeOptionalText: (
  ...values: unknown[]
) => string | undefined = (
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

const normalizeRequiredText: (
  values: unknown[],
  field: string,
) => string = (
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

const toTaskBackupTimeLog: (
  timeLog: TimeLog,
) => TaskBackupTimeLog = (
  timeLog: TimeLog,
): TaskBackupTimeLog => ({
  startTime: timeLog.startTime.getTime(),
  endTime: timeLog.endTime?.getTime(),
  description: timeLog.description ?? null,
});

const toBackupJiraWorkLog: (
  jiraWorkLog: JiraWorkLog,
) => TaskBackupJiraWorkLog = (
  jiraWorkLog: JiraWorkLog,
): TaskBackupJiraWorkLog => ({
  id: jiraWorkLog.id,
  workLogId: jiraWorkLog.workLogId,
  description: jiraWorkLog.description ?? null,
  startTime: jiraWorkLog.startTime.getTime(),
  timeSpentSeconds: jiraWorkLog.timeSpentSeconds,
});

const toSourceMetadataEntry: (
  value: Record<string, unknown>,
) => TaskBackupSourceMetadataEntry | undefined = (
  value: Record<string, unknown>,
): TaskBackupSourceMetadataEntry | undefined => {
  const metadata: TaskBackupSourceMetadataEntry = {
    id: typeof value['_id'] === 'string' ? value['_id'] : typeof value['id'] === 'string' ? value['id'] : undefined,
    createdAt: readPrivateNumber(value, '_createdAt'),
    updatedAt: readPrivateNumber(value, '_updatedAt'),
  };

  return metadata.id || metadata.createdAt || metadata.updatedAt ?
    metadata :
    undefined;
};

const toUnsupportedMetadata: (
  task: Task,
) => TaskBackupUnsupportedMetadata | undefined = (
  task: Task,
): TaskBackupUnsupportedMetadata | undefined => {
  const taskValue: Record<string, unknown> = task as unknown as Record<string, unknown>;
  const taskMetadata: TaskBackupUnsupportedMetadata = {
    task: toSourceMetadataEntry(taskValue),
    timeLogs: task.timeLogs
      .map((timeLog: TimeLog) => toSourceMetadataEntry(timeLog as unknown as Record<string, unknown>))
      .filter((value): value is TaskBackupSourceMetadataEntry => value !== undefined),
    tags: task.tags
      .map((tag: Tag) => toSourceMetadataEntry(tag as unknown as Record<string, unknown>))
      .filter((value): value is TaskBackupSourceMetadataEntry => value !== undefined),
    lastTimeLog: task.lastTimeLog ? toTaskBackupTimeLog(task.lastTimeLog) : undefined,
    jiraWorkLogs: task.jiraWorkLogs.length > 0 ? task.jiraWorkLogs.map(toBackupJiraWorkLog) : undefined,
    timeLogged: typeof taskValue['_timeLogged'] === 'number' ? task.timeLogged : undefined,
  };

  return (
    taskMetadata.task ||
    (taskMetadata.timeLogs && taskMetadata.timeLogs.length > 0) ||
    (taskMetadata.tags && taskMetadata.tags.length > 0) ||
    taskMetadata.lastTimeLog ||
    (taskMetadata.jiraWorkLogs && taskMetadata.jiraWorkLogs.length > 0) ||
    taskMetadata.timeLogged !== undefined
  ) ?
    taskMetadata :
    undefined;
};

const toBackupTask: (
  task: Task,
) => TaskBackupTask = (
  task: Task,
): TaskBackupTask => ({
  name: task.name,
  description: task.description ?? null,
  timeLogs: task.timeLogs.map(toTaskBackupTimeLog),
  tags: task.tags.map((tag: Tag): TaskBackupTagRef => ({
    id: tag.id,
    name: tag.name,
  })),
  metadata: toUnsupportedMetadata(task),
});

const normalizeBackupTimeLog: (
  value: unknown,
) => ImportTimeLogInput = (
  value: unknown,
): ImportTimeLogInput => {
  if (!isRecord(value)) {
    throw new Error('Imported time log must be an object.');
  }

  const source: LegacyTimeLogInput = value as LegacyTimeLogInput;
  const startTime: unknown = source.startTime ?? source._startTime;

  if (startTime === undefined) {
    throw new Error('Missing required field "startTime" for imported time log.');
  }

  const endTime: unknown = source.endTime ?? source._endTime;
  const description: string | undefined = normalizeOptionalText(
    source.description,
    source._description,
  );

  return {
    startTime: normalizeTimestamp(startTime, 'startTime'),
    endTime: endTime === null || endTime === undefined ?
      undefined :
      normalizeTimestamp(endTime, 'endTime'),
    description,
  };
};

const findMatchingTag: (
  tagRef: LegacyTagInput,
  currentTags: Tag[],
) => Tag | undefined = (
  tagRef: LegacyTagInput,
  currentTags: Tag[],
): Tag | undefined => {
  const id: string | undefined = typeof tagRef.id === 'string' ? tagRef.id : tagRef._id;
  const name: string | undefined = normalizeOptionalText(tagRef.name, tagRef._name)?.trim();

  return currentTags.find((tag: Tag) =>
    (id && tag.id === id) ||
    (name && normalizeKey(tag.name) === normalizeKey(name)));
};

const normalizeTagName: (
  value: unknown,
  currentTags: Tag[],
) => string = (
  value: unknown,
  currentTags: Tag[],
): string => {
  if (typeof value === 'string' && value.trim()) {
    const existingTag: Tag | undefined = currentTags.find((tag: Tag) => normalizeKey(tag.name) === normalizeKey(value));

    return existingTag?.name ?? value.trim();
  }

  if (!isRecord(value)) {
    throw new Error('Imported tag reference must be a string or object.');
  }

  const tagRef: LegacyTagInput = value as LegacyTagInput;
  const existingTag: Tag | undefined = findMatchingTag(tagRef, currentTags);

  if (existingTag) {
    return existingTag.name;
  }

  const name: string | undefined = normalizeOptionalText(tagRef.name, tagRef._name)?.trim();

  if (!name) {
    throw new Error('Imported tag reference must include a name when the tag does not exist locally.');
  }

  return name;
};

const buildUnsupportedMetadataWarning: (
  taskName: string,
  metadata: TaskBackupUnsupportedMetadata,
) => ImportWarning = (
  taskName: string,
  metadata: TaskBackupUnsupportedMetadata,
): ImportWarning => {
  const fields: string[] = [];

  if (metadata.task) {
    fields.push('source task metadata');
  }

  if (metadata.timeLogs?.length) {
    fields.push('source time log metadata');
  }

  if (metadata.tags?.length) {
    fields.push('source tag metadata');
  }

  if (metadata.lastTimeLog) {
    fields.push('lastTimeLog');
  }

  if (metadata.jiraWorkLogs?.length) {
    fields.push('jiraWorkLogs');
  }

  if (metadata.timeLogged !== undefined && metadata.timeLogged !== null) {
    fields.push('timeLogged');
  }

  return {
    code: 'unsupported-metadata',
    taskName,
    fields,
    message: `Task "${ taskName }" contains backup-only metadata: ${ fields.join(', ') }.`,
    metadata,
  };
};

const collectUnsupportedMetadata: (
  value: LegacyTaskInput,
) => TaskBackupUnsupportedMetadata | undefined = (
  value: LegacyTaskInput,
): TaskBackupUnsupportedMetadata | undefined => {
  if (isRecord(value.metadata)) {
    const metadataRecord: Record<string, unknown> = value.metadata;
    const task: TaskBackupSourceMetadataEntry | undefined = isRecord(metadataRecord['task']) ?
      {
        id: typeof metadataRecord['task']['id'] === 'string' ? metadataRecord['task']['id'] : undefined,
        createdAt: typeof metadataRecord['task']['createdAt'] === 'number' ? metadataRecord['task']['createdAt'] : undefined,
        updatedAt: typeof metadataRecord['task']['updatedAt'] === 'number' ? metadataRecord['task']['updatedAt'] : undefined,
      } :
      undefined;
    const timeLogs: TaskBackupSourceMetadataEntry[] | undefined = Array.isArray(metadataRecord['timeLogs']) ?
      metadataRecord['timeLogs']
        .filter(isRecord)
        .map((timeLog: Record<string, unknown>) => ({
          id: typeof timeLog['id'] === 'string' ? timeLog['id'] : undefined,
          createdAt: typeof timeLog['createdAt'] === 'number' ? timeLog['createdAt'] : undefined,
          updatedAt: typeof timeLog['updatedAt'] === 'number' ? timeLog['updatedAt'] : undefined,
        }))
        .filter((entry: TaskBackupSourceMetadataEntry) => entry.id || entry.createdAt || entry.updatedAt) :
      undefined;
    const tags: TaskBackupSourceMetadataEntry[] | undefined = Array.isArray(metadataRecord['tags']) ?
      metadataRecord['tags']
        .filter(isRecord)
        .map((tag: Record<string, unknown>) => ({
          id: typeof tag['id'] === 'string' ? tag['id'] : undefined,
          createdAt: typeof tag['createdAt'] === 'number' ? tag['createdAt'] : undefined,
          updatedAt: typeof tag['updatedAt'] === 'number' ? tag['updatedAt'] : undefined,
        }))
        .filter((entry: TaskBackupSourceMetadataEntry) => entry.id || entry.createdAt || entry.updatedAt) :
      undefined;
    const lastTimeLog: TaskBackupTimeLog | null | undefined = metadataRecord['lastTimeLog'] === null ?
      null :
      isRecord(metadataRecord['lastTimeLog']) ?
        normalizeBackupTimeLog(metadataRecord['lastTimeLog']) :
        undefined;
    const jiraWorkLogs: TaskBackupJiraWorkLog[] | undefined = Array.isArray(metadataRecord['jiraWorkLogs']) ?
      metadataRecord['jiraWorkLogs']
        .filter(isRecord)
        .map((jiraWorkLog: Record<string, unknown>) => ({
          id: typeof jiraWorkLog['id'] === 'string' ? jiraWorkLog['id'] : undefined,
          workLogId: normalizeOptionalText(jiraWorkLog['workLogId']),
          description: normalizeOptionalText(jiraWorkLog['description']) ?? null,
          startTime: normalizeTimestamp(jiraWorkLog['startTime'], 'metadata.jiraWorkLogs.startTime'),
          timeSpentSeconds: Number(jiraWorkLog['timeSpentSeconds']),
        })) :
      undefined;
    const timeLogged: number | null | undefined = metadataRecord['timeLogged'] === null ?
      null :
      typeof metadataRecord['timeLogged'] === 'number' && Number.isFinite(metadataRecord['timeLogged']) ?
        metadataRecord['timeLogged'] :
        undefined;

    const metadata: TaskBackupUnsupportedMetadata = {
      task,
      timeLogs: timeLogs?.length ? timeLogs : undefined,
      tags: tags?.length ? tags : undefined,
      lastTimeLog,
      jiraWorkLogs: jiraWorkLogs?.length ? jiraWorkLogs : undefined,
      timeLogged,
    };

    return (
      metadata.task ||
      metadata.timeLogs ||
      metadata.tags ||
      metadata.lastTimeLog !== undefined ||
      metadata.jiraWorkLogs ||
      metadata.timeLogged !== undefined
    ) ?
      metadata :
      undefined;
  }

  const rawTaskMetadata: TaskBackupSourceMetadataEntry = {
    id: typeof value.id === 'string' ? value.id : value._id,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : typeof value._createdAt === 'number' ? value._createdAt : undefined,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : typeof value._updatedAt === 'number' ? value._updatedAt : undefined,
  };
  const taskMetadata: TaskBackupSourceMetadataEntry | undefined = rawTaskMetadata.id || rawTaskMetadata.createdAt || rawTaskMetadata.updatedAt ?
    rawTaskMetadata :
    undefined;

  const rawTimeLogs: unknown = value.timeLogs ?? value._timeLogs;
  const timeLogsMetadata: TaskBackupSourceMetadataEntry[] | undefined = Array.isArray(rawTimeLogs) ?
    rawTimeLogs
      .filter(isRecord)
      .map((timeLog: Record<string, unknown>) => toSourceMetadataEntry(timeLog))
      .filter((entry): entry is TaskBackupSourceMetadataEntry => entry !== undefined) :
    undefined;

  const rawTags: unknown = value.tags ?? value._tags;
  const tagsMetadata: TaskBackupSourceMetadataEntry[] | undefined = Array.isArray(rawTags) ?
    rawTags
      .filter(isRecord)
      .map((tag: Record<string, unknown>) => toSourceMetadataEntry(tag))
      .filter((entry): entry is TaskBackupSourceMetadataEntry => entry !== undefined) :
    undefined;

  const rawLastTimeLog: unknown = value.lastTimeLog ?? value._lastTimeLog;
  const lastTimeLog: TaskBackupTimeLog | null | undefined = rawLastTimeLog === null ?
    null :
    isRecord(rawLastTimeLog) ?
      normalizeBackupTimeLog(rawLastTimeLog) :
      undefined;

  const rawJiraWorkLogs: unknown = value.jiraWorkLogs ?? value._jiraWorkLogs;
  const jiraWorkLogs: TaskBackupJiraWorkLog[] | undefined = Array.isArray(rawJiraWorkLogs) ?
    rawJiraWorkLogs.map((jiraWorkLog: unknown) => {
      if (!isRecord(jiraWorkLog)) {
        throw new Error('Imported jiraWorkLogs entry must be an object.');
      }

      return {
        id: typeof jiraWorkLog['id'] === 'string' ? jiraWorkLog['id'] : typeof jiraWorkLog['_id'] === 'string' ? jiraWorkLog['_id'] : undefined,
        workLogId: normalizeOptionalText(jiraWorkLog['workLogId']),
        description: normalizeOptionalText(jiraWorkLog['description']) ?? null,
        startTime: normalizeTimestamp(jiraWorkLog['startTime'], 'jiraWorkLogs.startTime'),
        timeSpentSeconds: Number(jiraWorkLog['timeSpentSeconds']),
      };
    }) :
    undefined;

  const rawTimeLogged: unknown = value.timeLogged ?? value._timeLogged;
  const timeLogged: number | null | undefined = rawTimeLogged === null ?
    null :
    typeof rawTimeLogged === 'number' && Number.isFinite(rawTimeLogged) ?
      rawTimeLogged :
      undefined;

  const metadata: TaskBackupUnsupportedMetadata = {
    task: taskMetadata,
    timeLogs: timeLogsMetadata?.length ? timeLogsMetadata : undefined,
    tags: tagsMetadata?.length ? tagsMetadata : undefined,
    lastTimeLog,
    jiraWorkLogs: jiraWorkLogs?.length ? jiraWorkLogs : undefined,
    timeLogged,
  };

  return (
    metadata.task ||
    metadata.timeLogs ||
    metadata.tags ||
    metadata.lastTimeLog !== undefined ||
    metadata.jiraWorkLogs ||
    metadata.timeLogged !== undefined
  ) ?
    metadata :
    undefined;
};

const normalizeTaskInput: (
  value: unknown,
  currentTags: Tag[],
  warnings: ImportWarning[],
) => ImportTaskInput = (
  value: unknown,
  currentTags: Tag[],
  warnings: ImportWarning[],
): ImportTaskInput => {
  if (!isRecord(value)) {
    throw new Error('Imported task must be an object.');
  }

  const task: LegacyTaskInput = value as LegacyTaskInput;
  const name: string = normalizeRequiredText(
    [task.name, task._name],
    'name',
  );
  const description: string | undefined = normalizeOptionalText(
    task.description,
    task._description,
  );
  const rawTimeLogs: unknown[] = pickArray(task, 'timeLogs', '_timeLogs');
  const rawTags: unknown[] = pickArray(task, 'tags', '_tags');
  const tags: string[] = [...new Set(rawTags.map((tag: unknown) => normalizeTagName(tag, currentTags)))];
  const timeLogs: ImportTimeLogInput[] = rawTimeLogs.map(normalizeBackupTimeLog);
  const unsupportedMetadata: TaskBackupUnsupportedMetadata | undefined = collectUnsupportedMetadata(task);

  if (unsupportedMetadata) {
    warnings.push(
      buildUnsupportedMetadataWarning(
        name,
        unsupportedMetadata,
      ),
    );
  }

  return {
    name,
    description,
    tags,
    timeLogs,
    unsupportedMetadata,
  };
};

const normalizeImportTasks: (
  input: unknown,
) => unknown[] = (
  input: unknown,
): unknown[] => {
  if (Array.isArray(input)) {
    return input;
  }

  if (isRecord(input) && input['version'] === 2 && Array.isArray(input['tasks'])) {
    return input['tasks'];
  }

  throw new Error('Unsupported task backup format.');
};

const collectDuplicateNames: (
  names: string[],
) => string[] = (
  names: string[],
): string[] => {
  const seen: Set<string> = new Set<string>();
  const duplicates: Set<string> = new Set<string>();

  names.forEach((name: string) => {
    const normalizedName: string = normalizeKey(name);

    if (seen.has(normalizedName)) {
      duplicates.add(name);
      return;
    }

    seen.add(normalizedName);
  });

  return [...duplicates];
};

export const createTaskBackupV2: (
  tasks: Task[],
) => TaskBackupV2 = (
  tasks: Task[],
): TaskBackupV2 => ({
  version: 2,
  exportedAt: Date.now(),
  tasks: tasks.map((task: Task) => toBackupTask(task)),
});

export const prepareTaskImportRequest: (
  input: unknown,
  currentTasks: Task[],
  currentTags: Tag[],
) => TaskImportRequest = (
  input: unknown,
  currentTasks: Task[],
  currentTags: Tag[],
): TaskImportRequest => {
  const taskInputs: unknown[] = normalizeImportTasks(input);
  const warnings: ImportWarning[] = [];
  const tasks: ImportTaskInput[] = taskInputs.map((taskInput: unknown) => normalizeTaskInput(taskInput, currentTags, warnings));
  const importedDuplicates: string[] = collectDuplicateNames(tasks.map((task: ImportTaskInput) => task.name));

  if (importedDuplicates.length > 0) {
    throw new Error(`Import contains duplicate task names: ${ importedDuplicates.join(', ') }.`);
  }

  const existingTaskNames: Set<string> = new Set<string>(currentTasks.map((task: Task) => normalizeKey(task.name)));
  const existingDuplicates: string[] = tasks
    .map((task: ImportTaskInput) => task.name)
    .filter((name: string) => existingTaskNames.has(normalizeKey(name)));

  if (existingDuplicates.length > 0) {
    throw new Error(`Import blocked because these task names already exist: ${ existingDuplicates.join(', ') }.`);
  }

  return {
    tasks,
    warnings,
  };
};
