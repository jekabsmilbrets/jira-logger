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
import type { LegacyTagInput, LegacyTaskInput, LegacyTimeLogInput } from '@tasks/interfaces/task-backup-legacy-input.interface';
import type { UnsupportedMetadataParser } from '@tasks/interfaces/unsupported-metadata-parser.interface';
import type { TimestampResolver, UnsupportedMetadataField, UnsupportedMetadataValue } from '@tasks/types/task-backup-metadata.type';

const normalizeKey: (value: string) => string = (value: string): string => value.trim().toLowerCase();

const isRecord: (value: unknown) => value is Record<string, unknown> = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

const timestampResolvers: TimestampResolver[] = [
  (value: string): number | undefined => {
    const numericValue: number = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  },
  (value: string): number | undefined => {
    const parsedDate: number = Date.parse(value);
    return Number.isFinite(parsedDate) ? parsedDate : undefined;
  },
];

const unsupportedMetadataFieldDefinitions: {
  field: UnsupportedMetadataField;
  label: string;
}[] = [
  { field: 'task', label: 'source task metadata' },
  { field: 'timeLogs', label: 'source time log metadata' },
  { field: 'tags', label: 'source tag metadata' },
  { field: 'lastTimeLog', label: 'lastTimeLog' },
  { field: 'jiraWorkLogs', label: 'jiraWorkLogs' },
  { field: 'timeLogged', label: 'timeLogged' },
];

const currentMetadataParsers: (
  metadataRecord: Record<string, unknown>,
) => UnsupportedMetadataParser[] = (
  metadataRecord: Record<string, unknown>,
): UnsupportedMetadataParser[] => [
  {
    field: 'task',
    parse: () => toMetadataEntry(metadataRecord['task'], ['id'], ['createdAt'], ['updatedAt']),
  },
  {
    field: 'timeLogs',
    parse: () => toMetadataEntries(metadataRecord['timeLogs'], ['id'], ['createdAt'], ['updatedAt']),
  },
  {
    field: 'tags',
    parse: () => toMetadataEntries(metadataRecord['tags'], ['id'], ['createdAt'], ['updatedAt']),
  },
  {
    field: 'lastTimeLog',
    parse: () => parseNullableBackupTimeLog(metadataRecord['lastTimeLog']),
  },
  {
    field: 'jiraWorkLogs',
    parse: () => toJiraWorkLogs(metadataRecord['jiraWorkLogs'], ['id'], 'metadata.jiraWorkLogs.startTime', false),
  },
  {
    field: 'timeLogged',
    parse: () => toOptionalLoggedTime(metadataRecord['timeLogged']),
  },
];

const legacyMetadataParsers: (
  value: LegacyTaskInput,
) => UnsupportedMetadataParser[] = (
  value: LegacyTaskInput,
): UnsupportedMetadataParser[] => [
  {
    field: 'task',
    parse: () => toMetadataEntry(value, ['id', '_id'], ['createdAt', '_createdAt'], ['updatedAt', '_updatedAt']),
  },
  {
    field: 'timeLogs',
    parse: () => toMetadataEntries(value.timeLogs ?? value._timeLogs, ['_id', 'id'], ['_createdAt'], ['_updatedAt']),
  },
  {
    field: 'tags',
    parse: () => toMetadataEntries(value.tags ?? value._tags, ['_id', 'id'], ['_createdAt'], ['_updatedAt']),
  },
  {
    field: 'lastTimeLog',
    parse: () => parseNullableBackupTimeLog(value.lastTimeLog ?? value._lastTimeLog),
  },
  {
    field: 'jiraWorkLogs',
    parse: () => toJiraWorkLogs(value.jiraWorkLogs ?? value._jiraWorkLogs, ['id', '_id'], 'jiraWorkLogs.startTime'),
  },
  {
    field: 'timeLogged',
    parse: () => toOptionalLoggedTime(value.timeLogged ?? value._timeLogged),
  },
];

const normalizeTimestamp: (
  value: unknown,
  field: string,
) => number = (
  value: unknown,
  field: string,
): number => {
  const dateValue: number | undefined = value instanceof Date ?
    value.getTime() :
    undefined;

  if (dateValue !== undefined && Number.isFinite(dateValue)) {
    return dateValue;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }
  }

  if (typeof value === 'string' && value.trim()) {
    for (const resolveTimestamp of timestampResolvers) {
      const resolvedTimestamp: number | undefined = resolveTimestamp(value);

      if (resolvedTimestamp !== undefined) {
        return resolvedTimestamp;
      }
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
  return toMetadataEntry(
    value,
    ['_id', 'id'],
    ['_createdAt'],
    ['_updatedAt'],
  );
};

const parseNullableBackupTimeLog: (
  value: unknown,
) => TaskBackupTimeLog | null | undefined = (
  value: unknown,
): TaskBackupTimeLog | null | undefined => {
  if (value === null) {
    return null;
  }

  return isRecord(value) ?
    normalizeBackupTimeLog(value) :
    undefined;
};

const readNumberByKeys: (
  value: Record<string, unknown>,
  keys: string[],
) => number | undefined = (
  value: Record<string, unknown>,
  keys: string[],
): number | undefined => {
  for (const key of keys) {
    const output: unknown = value[key];

    if (typeof output === 'number' && Number.isFinite(output)) {
      return output;
    }
  }

  return undefined;
};

const toMetadataEntry: (
  value: unknown,
  idKeys: string[],
  createdAtKeys: string[],
  updatedAtKeys: string[],
) => TaskBackupSourceMetadataEntry | undefined = (
  value: unknown,
  idKeys: string[],
  createdAtKeys: string[],
  updatedAtKeys: string[],
): TaskBackupSourceMetadataEntry | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: TaskBackupSourceMetadataEntry = {
    id: normalizeOptionalText(...idKeys.map((key: string) => value[key])),
    createdAt: readNumberByKeys(value, createdAtKeys),
    updatedAt: readNumberByKeys(value, updatedAtKeys),
  };

  return metadata.id || metadata.createdAt || metadata.updatedAt ?
    metadata :
    undefined;
};

const toMetadataEntries: (
  value: unknown,
  idKeys: string[],
  createdAtKeys: string[],
  updatedAtKeys: string[],
  includeEmpty?: boolean,
) => TaskBackupSourceMetadataEntry[] | undefined = (
  value: unknown,
  idKeys: string[],
  createdAtKeys: string[],
  updatedAtKeys: string[],
  includeEmpty: boolean = false,
): TaskBackupSourceMetadataEntry[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const metadataEntries: TaskBackupSourceMetadataEntry[] = value
    .map((entry: unknown) => toMetadataEntry(entry, idKeys, createdAtKeys, updatedAtKeys))
    .filter((entry): entry is TaskBackupSourceMetadataEntry => entry !== undefined);

  return metadataEntries.length > 0 || includeEmpty ?
    metadataEntries :
    undefined;
};

const toJiraWorkLogs: (
  value: unknown,
  idKeys: string[],
  startTimeField: string,
  strictObjects?: boolean,
) => TaskBackupJiraWorkLog[] | undefined = (
  value: unknown,
  idKeys: string[],
  startTimeField: string,
  strictObjects: boolean = true,
): TaskBackupJiraWorkLog[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const jiraWorkLogs: TaskBackupJiraWorkLog[] = value.flatMap((jiraWorkLog: unknown) => {
    if (!isRecord(jiraWorkLog)) {
      if (strictObjects) {
        throw new Error('Imported jiraWorkLogs entry must be an object.');
      }

      return [];
    }

    return [{
      id: normalizeOptionalText(...idKeys.map((key: string) => jiraWorkLog[key])),
      workLogId: normalizeOptionalText(jiraWorkLog['workLogId']),
      description: normalizeOptionalText(jiraWorkLog['description']) ?? null,
      startTime: normalizeTimestamp(jiraWorkLog['startTime'], startTimeField),
      timeSpentSeconds: Number(jiraWorkLog['timeSpentSeconds']),
    }];
  });

  return jiraWorkLogs.length > 0 ?
    jiraWorkLogs :
    undefined;
};

const toUnsupportedMetadataResult: (
  metadata: TaskBackupUnsupportedMetadata,
) => TaskBackupUnsupportedMetadata | undefined = (
  metadata: TaskBackupUnsupportedMetadata,
): TaskBackupUnsupportedMetadata | undefined => {
  const values: unknown[] = [
    metadata.task,
    metadata.timeLogs,
    metadata.tags,
    metadata.lastTimeLog,
    metadata.jiraWorkLogs,
    metadata.timeLogged,
  ];

  return values.some((value: unknown) => value !== undefined) ?
    metadata :
    undefined;
};

const toOptionalLoggedTime: (
  value: unknown,
) => number | null | undefined = (
  value: unknown,
): number | null | undefined => {
  if (value === null) {
    return null;
  }

  return typeof value === 'number' && Number.isFinite(value) ?
    value :
    undefined;
};

const collectUnsupportedMetadataFromParsers: (
  parsers: UnsupportedMetadataParser[],
) => TaskBackupUnsupportedMetadata | undefined = (
  parsers: UnsupportedMetadataParser[],
): TaskBackupUnsupportedMetadata | undefined => {
  const metadata: TaskBackupUnsupportedMetadata = {};

  parsers.forEach((parser: UnsupportedMetadataParser) => {
    Object.assign(metadata, {
      [parser.field]: parser.parse(),
    });
  });

  return toUnsupportedMetadataResult(metadata);
};

const toUnsupportedMetadata: (
  task: Task,
) => TaskBackupUnsupportedMetadata | undefined = (
  task: Task,
): TaskBackupUnsupportedMetadata | undefined => {
  const taskValue: Record<string, unknown> = task as unknown as Record<string, unknown>;
  return toUnsupportedMetadataResult({
    task: toSourceMetadataEntry(taskValue),
    timeLogs: toMetadataEntries(
      task.timeLogs.map((timeLog: TimeLog) => timeLog as unknown as Record<string, unknown>),
      ['_id', 'id'],
      ['_createdAt'],
      ['_updatedAt'],
      true,
    ),
    tags: toMetadataEntries(
      task.tags.map((tag: Tag) => tag as unknown as Record<string, unknown>),
      ['_id', 'id'],
      ['_createdAt'],
      ['_updatedAt'],
      true,
    ),
    lastTimeLog: task.lastTimeLog ? toTaskBackupTimeLog(task.lastTimeLog) : undefined,
    jiraWorkLogs: task.jiraWorkLogs.length > 0 ? task.jiraWorkLogs.map(toBackupJiraWorkLog) : undefined,
    timeLogged: typeof taskValue['_timeLogged'] === 'number' ? task.timeLogged : undefined,
  });
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
  const [startTime, endTime] = [source.startTime ?? source._startTime, source.endTime ?? source._endTime];

  if (startTime === undefined) {
    throw new Error('Missing required field "startTime" for imported time log.');
  }

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
    const normalizedName: string = normalizeKey(value);
    const existingTag: Tag | undefined = currentTags.find((tag: Tag) => normalizeKey(tag.name) === normalizedName);

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
  const fields: string[] = unsupportedMetadataFieldDefinitions
    .filter(({ field }) => {
      const value: UnsupportedMetadataValue = metadata[field];

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined && value !== null;
    })
    .map(({ label }) => label);

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
    return collectUnsupportedMetadataFromParsers(currentMetadataParsers(value.metadata));
  }

  return collectUnsupportedMetadataFromParsers(legacyMetadataParsers(value));
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

export const stringifyTaskBackupV2: (
  tasks: Task[],
) => string = (
  tasks: Task[],
): string => JSON.stringify(
  createTaskBackupV2(tasks),
  null,
  2,
);

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
