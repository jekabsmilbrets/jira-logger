import { afterEach, describe, expect, it, vi } from 'vitest';

import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { stringifyTaskBackup } from '@tasks/adapters/task-backup-export.adapter';
import { TaskBackupUnsupportedMetadataService } from '@tasks/services/task-backup-unsupported-metadata.service';

describe('Tasks Adapters task-backup-export.adapter', () => {
  const unsupportedMetadataService = new TaskBackupUnsupportedMetadataService();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports task backup v2 metadata from task, time logs, tags, and jira work logs', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_717_300_800_000);

    const tag: Tag = new Tag({ name: 'Alpha' });
    tag.id = 'tag-1';
    tag.createdAt = new Date('2026-06-01T08:00:00.000Z');

    const timeLog: TimeLog = new TimeLog({
      description: 'Focus block',
      startTime: new Date('2026-06-01T09:00:00.000Z'),
      endTime: new Date('2026-06-01T10:30:00.000Z'),
    });
    timeLog.id = 'time-log-1';
    timeLog.createdAt = new Date('2026-06-01T09:00:00.000Z');
    timeLog.updatedAt = new Date('2026-06-01T10:30:00.000Z');

    const lastTimeLog: TimeLog = new TimeLog({
      description: 'Last log',
      startTime: new Date('2026-06-01T11:00:00.000Z'),
      endTime: new Date('2026-06-01T12:00:00.000Z'),
    });

    const jiraWorkLog: JiraWorkLog = new JiraWorkLog({
      id: 'jira-1',
      workLogId: 'worklog-7',
      description: 'Synced work',
      startTime: new Date('2026-06-01T13:00:00.000Z'),
      timeSpentSeconds: 7200,
    });

    const task: Task = new Task({
      name: 'Task A',
      description: 'Export me',
      tags: [tag],
      timeLogs: [timeLog],
      jiraWorkLogs: [jiraWorkLog],
      lastTimeLog,
    });
    task.id = 'task-1';
    task.createdAt = new Date('2026-06-01T07:00:00.000Z');
    task.updatedAt = new Date('2026-06-01T14:00:00.000Z');

    expect(JSON.parse(stringifyTaskBackup(
      [task],
      (sourceTask: Task) => unsupportedMetadataService.readExportMetadata(sourceTask),
    ))).toEqual({
      version: 2,
      exportedAt: 1_717_300_800_000,
      tasks: [{
        name: 'Task A',
        description: 'Export me',
        timeLogs: [{
          startTime: Date.parse('2026-06-01T09:00:00.000Z'),
          endTime: Date.parse('2026-06-01T10:30:00.000Z'),
          description: 'Focus block',
        }],
        tags: [{
          id: 'tag-1',
          name: 'Alpha',
        }],
        metadata: {
          task: {
            id: 'task-1',
            createdAt: Date.parse('2026-06-01T07:00:00.000Z'),
            updatedAt: Date.parse('2026-06-01T14:00:00.000Z'),
          },
          timeLogs: [{
            id: 'time-log-1',
            createdAt: Date.parse('2026-06-01T09:00:00.000Z'),
            updatedAt: Date.parse('2026-06-01T10:30:00.000Z'),
          }],
          tags: [{
            id: 'tag-1',
            createdAt: Date.parse('2026-06-01T08:00:00.000Z'),
          }],
          lastTimeLog: {
            startTime: Date.parse('2026-06-01T11:00:00.000Z'),
            endTime: Date.parse('2026-06-01T12:00:00.000Z'),
            description: 'Last log',
          },
          jiraWorkLogs: [{
            id: 'jira-1',
            workLogId: 'worklog-7',
            description: 'Synced work',
            startTime: Date.parse('2026-06-01T13:00:00.000Z'),
            timeSpentSeconds: 7200,
          }],
          timeLogged: 5400,
        },
      }],
    });
  });
});
