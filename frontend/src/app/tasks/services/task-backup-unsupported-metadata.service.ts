import { Service } from '@angular/core';

import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import type { ImportWarning } from '@tasks/interfaces/import-report.interface';
import type { ImportTimeLogInput } from '@tasks/interfaces/import-task-input.interface';
import type {
  TaskBackupJiraWorkLog,
  TaskBackupSourceMetadataEntry,
  TaskBackupTimeLog,
  TaskBackupUnsupportedMetadata,
} from '@tasks/interfaces/task-backup.interface';
import type { TaskBackupLegacyTaskInput, TaskBackupLegacyTimeLogInput } from '@tasks/interfaces/task-backup-legacy-input.interface';
import type { UnsupportedMetadataParser } from '@tasks/interfaces/unsupported-metadata-parser.interface';
import type { UnsupportedMetadataField, UnsupportedMetadataValue } from '@tasks/types/task-backup-metadata.type';

export interface TaskBackupExportMetadata {
  timeLogs: TaskBackupTimeLog[];
  metadata?: TaskBackupUnsupportedMetadata;
}

export interface TaskBackupImportMetadata {
  timeLogs: ImportTimeLogInput[];
  unsupportedMetadata?: TaskBackupUnsupportedMetadata;
  warning?: ImportWarning;
}

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

@Service()
export class TaskBackupUnsupportedMetadataService {
  public readExportMetadata(
    task: Task,
  ): TaskBackupExportMetadata {
    return {
      timeLogs: task.timeLogs.map((timeLog: TimeLog) => this.toTaskBackupTimeLog(timeLog)),
      metadata: this.collectFromTask(task),
    };
  }

  public readImportMetadata(
    value: TaskBackupLegacyTaskInput,
    taskName: string,
  ): TaskBackupImportMetadata {
    const rawTimeLogs: unknown[] = this.pickTimeLogs(value);
    const timeLogs: ImportTimeLogInput[] = rawTimeLogs.map((timeLog: unknown) => this.normalizeBackupTimeLog(timeLog));
    const unsupportedMetadata: TaskBackupUnsupportedMetadata | undefined = this.collectFromImport(value);

    return {
      timeLogs,
      unsupportedMetadata,
      warning: unsupportedMetadata ? this.buildWarning(taskName, unsupportedMetadata) : undefined,
    };
  }

  private toTaskBackupTimeLog(
    timeLog: TimeLog,
  ): TaskBackupTimeLog {
    return {
      startTime: timeLog.startTime.getTime(),
      endTime: timeLog.endTime?.getTime(),
      description: timeLog.description ?? null,
    };
  }

  private normalizeBackupTimeLog(
    value: unknown,
  ): ImportTimeLogInput {
    if (!this.isRecord(value)) {
      throw new Error('Imported time log must be an object.');
    }

    const source: TaskBackupLegacyTimeLogInput = value as TaskBackupLegacyTimeLogInput;
    const [startTime, endTime] = [source.startTime ?? source._startTime, source.endTime ?? source._endTime];

    if (startTime === undefined) {
      throw new Error('Missing required field "startTime" for imported time log.');
    }

    const description: string | undefined = this.normalizeOptionalText(
      source.description,
      source._description,
    );

    return {
      startTime: this.normalizeTimestamp(startTime, 'startTime'),
      endTime: endTime === null || endTime === undefined ?
        undefined :
        this.normalizeTimestamp(endTime, 'endTime'),
      description,
    };
  }

  private collectFromTask(
    task: Task,
  ): TaskBackupUnsupportedMetadata | undefined {
    const taskValue: Record<string, unknown> = task as unknown as Record<string, unknown>;

    return this.toUnsupportedMetadataResult({
      task: this.toSourceMetadataEntry(taskValue),
      timeLogs: this.toMetadataEntries(
        task.timeLogs.map((timeLog: TimeLog) => timeLog as unknown as Record<string, unknown>),
        ['_id', 'id'],
        ['_createdAt'],
        ['_updatedAt'],
        true,
      ),
      tags: this.toMetadataEntries(
        task.tags.map((tag: Tag) => tag as unknown as Record<string, unknown>),
        ['_id', 'id'],
        ['_createdAt'],
        ['_updatedAt'],
        true,
      ),
      lastTimeLog: task.lastTimeLog ? this.toTaskBackupTimeLog(task.lastTimeLog) : undefined,
      jiraWorkLogs: task.jiraWorkLogs.length > 0 ?
        task.jiraWorkLogs.map((jiraWorkLog: JiraWorkLog) => this.toBackupJiraWorkLog(jiraWorkLog)) :
        undefined,
      timeLogged: typeof taskValue['_timeLogged'] === 'number' ? task.timeLogged : undefined,
    });
  }

  private collectFromImport(
    value: TaskBackupLegacyTaskInput,
  ): TaskBackupUnsupportedMetadata | undefined {
    if (this.isRecord(value.metadata)) {
      return this.collectFromParsers(this.currentMetadataParsers(value.metadata));
    }

    return this.collectFromParsers(this.legacyMetadataParsers(value));
  }

  private buildWarning(
    taskName: string,
    metadata: TaskBackupUnsupportedMetadata,
  ): ImportWarning {
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
  }

  private isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private pickTimeLogs(
    value: TaskBackupLegacyTaskInput,
  ): unknown[] {
    const output: unknown = value.timeLogs ?? value._timeLogs;

    if (!Array.isArray(output)) {
      throw new Error('Missing required field "timeLogs" for imported task.');
    }

    return output;
  }

  private normalizeOptionalText(
    ...values: unknown[]
  ): string | undefined {
    for (const value of values) {
      if (typeof value === 'string') {
        return value;
      }

      if (value === null) {
        return undefined;
      }
    }

    return undefined;
  }

  private currentMetadataParsers(
    metadataRecord: Record<string, unknown>,
  ): UnsupportedMetadataParser[] {
    return [
      {
        field: 'task',
        parse: () => this.toMetadataEntry(metadataRecord['task'], ['id'], ['createdAt'], ['updatedAt']),
      },
      {
        field: 'timeLogs',
        parse: () => this.toMetadataEntries(metadataRecord['timeLogs'], ['id'], ['createdAt'], ['updatedAt']),
      },
      {
        field: 'tags',
        parse: () => this.toMetadataEntries(metadataRecord['tags'], ['id'], ['createdAt'], ['updatedAt']),
      },
      {
        field: 'lastTimeLog',
        parse: () => this.parseNullableBackupTimeLog(metadataRecord['lastTimeLog']),
      },
      {
        field: 'jiraWorkLogs',
        parse: () => this.toJiraWorkLogs(metadataRecord['jiraWorkLogs'], ['id'], 'metadata.jiraWorkLogs.startTime', false),
      },
      {
        field: 'timeLogged',
        parse: () => this.toOptionalLoggedTime(metadataRecord['timeLogged']),
      },
    ];
  }

  private legacyMetadataParsers(
    value: TaskBackupLegacyTaskInput,
  ): UnsupportedMetadataParser[] {
    return [
      {
        field: 'task',
        parse: () => this.toMetadataEntry(value, ['id', '_id'], ['createdAt', '_createdAt'], ['updatedAt', '_updatedAt']),
      },
      {
        field: 'timeLogs',
        parse: () => this.toMetadataEntries(value.timeLogs ?? value._timeLogs, ['_id', 'id'], ['_createdAt'], ['_updatedAt']),
      },
      {
        field: 'tags',
        parse: () => this.toMetadataEntries(value.tags ?? value._tags, ['_id', 'id'], ['_createdAt'], ['_updatedAt']),
      },
      {
        field: 'lastTimeLog',
        parse: () => this.parseNullableBackupTimeLog(value.lastTimeLog ?? value._lastTimeLog),
      },
      {
        field: 'jiraWorkLogs',
        parse: () => this.toJiraWorkLogs(value.jiraWorkLogs ?? value._jiraWorkLogs, ['id', '_id'], 'jiraWorkLogs.startTime'),
      },
      {
        field: 'timeLogged',
        parse: () => this.toOptionalLoggedTime(value.timeLogged ?? value._timeLogged),
      },
    ];
  }

  private normalizeTimestamp(
    value: unknown,
    field: string,
  ): number {
    const dateValue: number | undefined = value instanceof Date ?
      value.getTime() :
      undefined;

    if (dateValue !== undefined && Number.isFinite(dateValue)) {
      return dateValue;
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
  }

  private toSourceMetadataEntry(
    value: Record<string, unknown>,
  ): TaskBackupSourceMetadataEntry | undefined {
    return this.toMetadataEntry(
      value,
      ['_id', 'id'],
      ['_createdAt'],
      ['_updatedAt'],
    );
  }

  private toBackupJiraWorkLog(
    jiraWorkLog: JiraWorkLog,
  ): TaskBackupJiraWorkLog {
    return {
      id: jiraWorkLog.id,
      workLogId: jiraWorkLog.workLogId,
      description: jiraWorkLog.description ?? null,
      startTime: jiraWorkLog.startTime.getTime(),
      timeSpentSeconds: jiraWorkLog.timeSpentSeconds,
    };
  }

  private parseNullableBackupTimeLog(
    value: unknown,
  ): TaskBackupTimeLog | null | undefined {
    if (value === null) {
      return null;
    }

    return this.isRecord(value) ?
      this.normalizeBackupTimeLog(value) :
      undefined;
  }

  private readNumberByKeys(
    value: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const output: unknown = value[key];

      if (typeof output === 'number' && Number.isFinite(output)) {
        return output;
      }
    }

    return undefined;
  }

  private toMetadataEntry(
    value: unknown,
    idKeys: string[],
    createdAtKeys: string[],
    updatedAtKeys: string[],
  ): TaskBackupSourceMetadataEntry | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const metadata: TaskBackupSourceMetadataEntry = {
      id: this.normalizeOptionalText(...idKeys.map((key: string) => value[key])),
      createdAt: this.readNumberByKeys(value, createdAtKeys),
      updatedAt: this.readNumberByKeys(value, updatedAtKeys),
    };

    return metadata.id || metadata.createdAt || metadata.updatedAt ?
      metadata :
      undefined;
  }

  private toMetadataEntries(
    value: unknown,
    idKeys: string[],
    createdAtKeys: string[],
    updatedAtKeys: string[],
    includeEmpty: boolean = false,
  ): TaskBackupSourceMetadataEntry[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const metadataEntries: TaskBackupSourceMetadataEntry[] = value
      .map((entry: unknown) => this.toMetadataEntry(entry, idKeys, createdAtKeys, updatedAtKeys))
      .filter((entry): entry is TaskBackupSourceMetadataEntry => entry !== undefined);

    return metadataEntries.length > 0 || includeEmpty ?
      metadataEntries :
      undefined;
  }

  private toJiraWorkLogs(
    value: unknown,
    idKeys: string[],
    startTimeField: string,
    strictObjects: boolean = true,
  ): TaskBackupJiraWorkLog[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const jiraWorkLogs: TaskBackupJiraWorkLog[] = value.flatMap((jiraWorkLog: unknown) => {
      if (!this.isRecord(jiraWorkLog)) {
        if (strictObjects) {
          throw new Error('Imported jiraWorkLogs entry must be an object.');
        }

        return [];
      }

      return [{
        id: this.normalizeOptionalText(...idKeys.map((key: string) => jiraWorkLog[key])),
        workLogId: this.normalizeOptionalText(jiraWorkLog['workLogId']),
        description: this.normalizeOptionalText(jiraWorkLog['description']) ?? null,
        startTime: this.normalizeTimestamp(jiraWorkLog['startTime'], startTimeField),
        timeSpentSeconds: Number(jiraWorkLog['timeSpentSeconds']),
      }];
    });

    return jiraWorkLogs.length > 0 ?
      jiraWorkLogs :
      undefined;
  }

  private toUnsupportedMetadataResult(
    metadata: TaskBackupUnsupportedMetadata,
  ): TaskBackupUnsupportedMetadata | undefined {
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
  }

  private toOptionalLoggedTime(
    value: unknown,
  ): number | null | undefined {
    if (value === null) {
      return null;
    }

    return typeof value === 'number' && Number.isFinite(value) ?
      value :
      undefined;
  }

  private collectFromParsers(
    parsers: UnsupportedMetadataParser[],
  ): TaskBackupUnsupportedMetadata | undefined {
    const metadata: TaskBackupUnsupportedMetadata = {};

    parsers.forEach((parser: UnsupportedMetadataParser) => {
      Object.assign(metadata, {
        [parser.field]: parser.parse(),
      });
    });

    return this.toUnsupportedMetadataResult(metadata);
  }
}
