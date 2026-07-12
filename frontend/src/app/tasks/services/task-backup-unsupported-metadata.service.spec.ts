import { describe, expect, it } from 'vitest';

import { JiraWorkLog } from '@shared/models/jira-work-log.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TaskBackupUnsupportedMetadataService } from './task-backup-unsupported-metadata.service';

describe('Tasks Service TaskBackupUnsupportedMetadataService', () => {
  const service = new TaskBackupUnsupportedMetadataService();

  it('uses current time log fields when both formats are present', () => {
    expect(service.readImportMetadata({
      timeLogs: [{ startTime: '2026-06-01T09:00:00.000Z', endTime: 1_717_232_200_000, description: ' Current ' }],
      _timeLogs: [{ _startTime: 1_717_228_600_000, _description: ' Legacy ' }],
    }, 'Imported task').timeLogs).toEqual([
      { startTime: 1_780_304_400_000, endTime: 1_717_232_200_000, description: ' Current ' },
    ]);
  });

  it('rejects imported time logs without a start time', () => {
    expect(() => service.readImportMetadata({ timeLogs: [{}] }, 'Imported task'))
      .toThrow('Missing required field "startTime" for imported time log.');
  });
  it('keeps current-format unsupported metadata and reports every populated field', () => {
    const result = service.readImportMetadata({
      timeLogs: [{ startTime: new Date(100), endTime: null, description: null }],
      metadata: {
        task: { id: 'task-1', createdAt: 1, updatedAt: 2 },
        timeLogs: [{ id: 'log-1', createdAt: 3 }, {}],
        tags: [{ id: 'tag-1', updatedAt: 4 }],
        lastTimeLog: null,
        jiraWorkLogs: [{
          id: 'jira-1', workLogId: 'worklog-1', description: 'Synced', startTime: '200', timeSpentSeconds: '60',
        }, 'ignored'],
        timeLogged: null,
      },
    }, 'Imported task');

    expect(result).toMatchObject({
      timeLogs: [{ startTime: 100, endTime: undefined, description: undefined }],
      unsupportedMetadata: {
        task: { id: 'task-1', createdAt: 1, updatedAt: 2 },
        timeLogs: [{ id: 'log-1', createdAt: 3 }],
        tags: [{ id: 'tag-1', updatedAt: 4 }],
        lastTimeLog: null,
        jiraWorkLogs: [{ id: 'jira-1', workLogId: 'worklog-1', description: 'Synced', startTime: 200, timeSpentSeconds: 60 }],
        timeLogged: null,
      },
    });
    expect(result.warning?.fields).toEqual([
      'source task metadata', 'source time log metadata', 'source tag metadata', 'jiraWorkLogs',
    ]);
  });

  it('reads legacy metadata and validates strict legacy jira work logs', () => {
    const result = service.readImportMetadata({
      _timeLogs: [{ _startTime: '300', _endTime: 400, _description: 'Legacy' }],
      _id: 'task-1', _createdAt: 1, _updatedAt: 2,
      _tags: [{ _id: 'tag-1', _createdAt: 3 }],
      _lastTimeLog: { _startTime: 500 },
      _jiraWorkLogs: [{ _id: 'jira-1', startTime: 600, timeSpentSeconds: 30 }],
      _timeLogged: 90,
    }, 'Legacy task');

    expect(result.unsupportedMetadata).toMatchObject({
      task: { id: 'task-1', createdAt: 1, updatedAt: 2 },
      tags: [{ id: 'tag-1', createdAt: 3 }], lastTimeLog: { startTime: 500 },
      jiraWorkLogs: [{ id: 'jira-1', startTime: 600, timeSpentSeconds: 30 }], timeLogged: 90,
    });
    expect(() => service.readImportMetadata({ timeLogs: [{ startTime: 1 }], jiraWorkLogs: ['bad'] }, 'Invalid task'))
      .toThrow('Imported jiraWorkLogs entry must be an object.');
  });

  it('exports time logs and empty source collections', () => {
    expect(service.readExportMetadata(new Task({ name: 'Task', timeLogs: [], tags: [] })))
      .toMatchObject({ timeLogs: [], metadata: { timeLogs: [], tags: [] } });
  });

  it('rejects imports without a time-log array', () => {
    expect(() => service.readImportMetadata({ tags: [] }, 'Imported task'))
      .toThrow('Missing required field "timeLogs" for imported task.');
  });

  it('exports optional metadata fields and parses date-form timestamps', () => {
    const task = new Task({
      timeLogs: [new TimeLog({ startTime: new Date(0) } as any)],
      jiraWorkLogs: [new JiraWorkLog({ startTime: new Date(0), timeSpentSeconds: 1 } as any)],
      tags: [],
    } as any);
    delete (task as any)._timeLogged;

    expect(service.readExportMetadata(task).metadata?.jiraWorkLogs?.[0]).toMatchObject({ description: null });
    expect(service.readImportMetadata({
      timeLogs: [{ startTime: '2024-01-01' }],
      metadata: { task: { id: 'task-1' }, jiraWorkLogs: [] },
    }, 'Imported task').unsupportedMetadata?.jiraWorkLogs).toBeUndefined();
  });

  it('rejects non-object logs and invalid timestamps', () => {
    expect(() => service.readImportMetadata({ timeLogs: [null] }, 'Invalid task'))
      .toThrow('Imported time log must be an object.');
    expect(() => service.readImportMetadata({ timeLogs: [{ startTime: ' ' }] }, 'Invalid task'))
      .toThrow('Invalid timestamp for "startTime".');
  });
});
