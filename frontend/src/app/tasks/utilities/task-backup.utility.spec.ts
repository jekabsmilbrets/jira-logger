import { afterEach, describe, expect, it, vi } from 'vitest';

import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { createTaskBackupV2, prepareTaskImportRequest, stringifyTaskBackupV2 } from './task-backup.utility';

describe('task-backup.utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports backup metadata from task, time logs, tags, and jira work logs', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_717_300_800_000);

    const tag: Tag = new Tag({ name: 'Alpha' });
    tag.id = 'tag-1';
    tag.createdAt = new Date('2026-06-01T08:00:00.000Z');

    const timeLog: TimeLog = new TimeLog({ description: 'Focus block' });
    timeLog.id = 'time-log-1';
    timeLog.createdAt = new Date('2026-06-01T09:00:00.000Z');
    timeLog.updatedAt = new Date('2026-06-01T10:00:00.000Z');
    timeLog.startTime = new Date('2026-06-01T09:00:00.000Z');
    timeLog.endTime = new Date('2026-06-01T10:30:00.000Z');

    const lastTimeLog: TimeLog = new TimeLog({ description: 'Most recent' });
    lastTimeLog.startTime = new Date('2026-06-01T11:00:00.000Z');
    lastTimeLog.endTime = new Date('2026-06-01T12:00:00.000Z');

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

    const result = createTaskBackupV2([task]);

    expect(result).toEqual({
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
            updatedAt: Date.parse('2026-06-01T10:00:00.000Z'),
          }],
          tags: [{
            id: 'tag-1',
            createdAt: Date.parse('2026-06-01T08:00:00.000Z'),
          }],
          lastTimeLog: {
            startTime: Date.parse('2026-06-01T11:00:00.000Z'),
            endTime: Date.parse('2026-06-01T12:00:00.000Z'),
            description: 'Most recent',
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

  it('stringifies canonical task backup v2', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_717_300_800_000);

    const output = stringifyTaskBackupV2([
      new Task({ name: 'Exported task', timeLogs: [], tags: [] }),
    ]);

    expect(JSON.parse(output)).toEqual({
      version: 2,
      exportedAt: 1_717_300_800_000,
      tasks: [expect.objectContaining({ name: 'Exported task' })],
    });
    expect(output).toContain('\n  "version": 2');
  });

  it('parses metadata from version 2 imports and emits unsupported-metadata warnings', () => {
    const result = prepareTaskImportRequest(
      {
        version: 2,
        tasks: [{
          name: 'Imported task',
          description: 'Current format',
          timeLogs: [{
            startTime: '2026-06-01T09:00:00.000Z',
            endTime: 1_717_232_200_000,
            description: 'Imported time log',
          }],
          tags: [{
            id: 'tag-1',
            name: 'Alpha',
          }],
          metadata: {
            task: {
              id: 'task-1',
              createdAt: 1_717_226_800_000,
              updatedAt: 1_717_252_000_000,
            },
            timeLogs: [{
              id: 'time-log-1',
              createdAt: 1_717_234_000_000,
            }],
            tags: [{
              id: 'tag-1',
              updatedAt: 1_717_252_000_000,
            }],
            lastTimeLog: null,
            jiraWorkLogs: [{
              id: 'jira-1',
              workLogId: 'worklog-7',
              description: 'Synced work',
              startTime: '2026-06-01T13:00:00.000Z',
              timeSpentSeconds: 7200,
            }],
            timeLogged: 3600,
          },
        }],
      },
      [],
      [new Tag({ id: 'tag-1', name: 'Alpha' })],
    );

    expect(result.tasks).toEqual([{
      name: 'Imported task',
      description: 'Current format',
      tags: ['Alpha'],
      timeLogs: [{
        startTime: Date.parse('2026-06-01T09:00:00.000Z'),
        endTime: 1_717_232_200_000,
        description: 'Imported time log',
      }],
      unsupportedMetadata: {
        task: {
          id: 'task-1',
          createdAt: 1_717_226_800_000,
          updatedAt: 1_717_252_000_000,
        },
        timeLogs: [{
          id: 'time-log-1',
          createdAt: 1_717_234_000_000,
        }],
        tags: [{
          id: 'tag-1',
          updatedAt: 1_717_252_000_000,
        }],
        lastTimeLog: null,
        jiraWorkLogs: [{
          id: 'jira-1',
          workLogId: 'worklog-7',
          description: 'Synced work',
          startTime: Date.parse('2026-06-01T13:00:00.000Z'),
          timeSpentSeconds: 7200,
        }],
        timeLogged: 3600,
      },
    }]);
    expect(result.warnings).toEqual([{
      code: 'unsupported-metadata',
      taskName: 'Imported task',
      fields: [
        'source task metadata',
        'source time log metadata',
        'source tag metadata',
        'jiraWorkLogs',
        'timeLogged',
      ],
      message: 'Task "Imported task" contains backup-only metadata: source task metadata, source time log metadata, source tag metadata, jiraWorkLogs, timeLogged.',
      metadata: result.tasks[0]?.unsupportedMetadata,
    }]);
  });

  it('ignores non-object jira work log metadata entries in version 2 backups', () => {
    const result = prepareTaskImportRequest(
      {
        version: 2,
        tasks: [{
          name: 'Imported task',
          timeLogs: [],
          tags: [],
          metadata: {
            jiraWorkLogs: [
              'skip-me',
              {
                id: 'jira-1',
                workLogId: 'worklog-7',
                description: 'Synced work',
                startTime: '2026-06-01T13:00:00.000Z',
                timeSpentSeconds: 7200,
              },
            ],
          },
        }],
      },
      [],
      [],
    );

    expect(result.tasks[0]?.unsupportedMetadata).toEqual({
      jiraWorkLogs: [{
        id: 'jira-1',
        workLogId: 'worklog-7',
        description: 'Synced work',
        startTime: Date.parse('2026-06-01T13:00:00.000Z'),
        timeSpentSeconds: 7200,
      }],
    });
  });

  it('parses legacy task metadata fields and keeps existing tag names', () => {
    const result = prepareTaskImportRequest(
      [{
        _name: 'Legacy task',
        _description: 'Legacy format',
        _timeLogs: [{
          _id: 'time-log-1',
          _createdAt: 1_717_230_400_000,
          _updatedAt: 1_717_234_000_000,
          _startTime: '2026-06-01T09:00:00.000Z',
          _endTime: '2026-06-01T10:00:00.000Z',
          _description: 'Legacy time log',
        }],
        _tags: [{
          _id: 'tag-1',
          _name: 'alpha',
        }],
        _lastTimeLog: {
          _startTime: 1_717_237_600_000,
          _endTime: 1_717_241_200_000,
          _description: 'Last legacy log',
        },
        _jiraWorkLogs: [{
          _id: 'jira-1',
          workLogId: 'worklog-legacy',
          description: 'Legacy synced work',
          startTime: 1_717_244_800_000,
          timeSpentSeconds: 1200,
        }],
        _timeLogged: 1234,
        _id: 'task-1',
        _createdAt: 1_717_226_800_000,
        _updatedAt: 1_717_252_000_000,
      }],
      [],
      [new Tag({ id: 'tag-1', name: 'Alpha' })],
    );

    expect(result.tasks[0]).toEqual({
      name: 'Legacy task',
      description: 'Legacy format',
      tags: ['Alpha'],
      timeLogs: [{
        startTime: Date.parse('2026-06-01T09:00:00.000Z'),
        endTime: Date.parse('2026-06-01T10:00:00.000Z'),
        description: 'Legacy time log',
      }],
      unsupportedMetadata: {
        task: {
          id: 'task-1',
          createdAt: 1_717_226_800_000,
          updatedAt: 1_717_252_000_000,
        },
        timeLogs: [{
          id: 'time-log-1',
          createdAt: 1_717_230_400_000,
          updatedAt: 1_717_234_000_000,
        }],
        tags: [{
          id: 'tag-1',
        }],
        lastTimeLog: {
          startTime: 1_717_237_600_000,
          endTime: 1_717_241_200_000,
          description: 'Last legacy log',
        },
        jiraWorkLogs: [{
          id: 'jira-1',
          workLogId: 'worklog-legacy',
          description: 'Legacy synced work',
          startTime: 1_717_244_800_000,
          timeSpentSeconds: 1200,
        }],
        timeLogged: 1234,
      },
    });
  });

  it('rejects duplicate imported task names ignoring case and whitespace', () => {
    expect(() => prepareTaskImportRequest(
      [
        {
          name: 'Task A',
          timeLogs: [],
          tags: [],
        },
        {
          name: ' task a ',
          timeLogs: [],
          tags: [],
        },
      ],
      [],
      [],
    )).toThrow('Import contains duplicate task names: task a.');
  });

  it('rejects imported task names that already exist locally', () => {
    expect(() => prepareTaskImportRequest(
      [{
        name: 'Task A',
        timeLogs: [],
        tags: [],
      }],
      [new Task({ name: ' task a ' })],
      [],
    )).toThrow('Import blocked because these task names already exist: Task A.');
  });
});
