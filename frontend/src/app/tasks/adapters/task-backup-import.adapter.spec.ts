import { describe, expect, it } from 'vitest';

import { Tag } from '@shared/models/tag.model';

import { adaptTaskImportRequest } from '@tasks/adapters/task-backup-import.adapter';
import { TaskBackupUnsupportedMetadataService } from '@tasks/services/task-backup-unsupported-metadata.service';

describe('task-backup-import.adapter', () => {
  const unsupportedMetadataService = new TaskBackupUnsupportedMetadataService();

  it('parses version 2 import metadata and warnings', () => {
    const result = adaptTaskImportRequest(
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
          tags: [{ id: 'tag-1', name: 'Alpha' }],
          metadata: {
            task: { id: 'task-1', createdAt: 1_717_226_800_000, updatedAt: 1_717_252_000_000 },
            timeLogs: [{ id: 'time-log-1', createdAt: 1_717_234_000_000 }],
            tags: [{ id: 'tag-1', updatedAt: 1_717_252_000_000 }],
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
      [new Tag({ id: 'tag-1', name: 'Alpha' })],
      (task, name) => unsupportedMetadataService.readImportMetadata(task, name),
    );

    expect(result.tasks[0]).toEqual(expect.objectContaining({
      name: 'Imported task',
      tags: [{ name: 'Alpha', existingTagId: 'tag-1' }],
      timeLogs: [{
        startTime: Date.parse('2026-06-01T09:00:00.000Z'),
        endTime: 1_717_232_200_000,
        description: 'Imported time log',
      }],
      unsupportedMetadata: expect.objectContaining({
        task: { id: 'task-1', createdAt: 1_717_226_800_000, updatedAt: 1_717_252_000_000 },
        timeLogged: 3600,
      }),
    }));
    expect(result.warnings).toEqual([expect.objectContaining({
      code: 'unsupported-metadata',
      taskName: 'Imported task',
    })]);
  });

  it('parses legacy task metadata fields and keeps existing tag names', () => {
    const result = adaptTaskImportRequest(
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
        _tags: [{ _id: 'tag-1', _name: 'Alpha' }],
        _timeLogged: 1234,
        _id: 'task-1',
        _createdAt: 1_717_226_800_000,
        _updatedAt: 1_717_252_000_000,
      }],
      [new Tag({ id: 'tag-1', name: 'Alpha' })],
      (task, name) => unsupportedMetadataService.readImportMetadata(task, name),
    );

    expect(result.tasks[0]).toEqual(expect.objectContaining({
      name: 'Legacy task',
      description: 'Legacy format',
      tags: [{ name: 'Alpha', existingTagId: 'tag-1' }],
      timeLogs: [{
        startTime: Date.parse('2026-06-01T09:00:00.000Z'),
        endTime: Date.parse('2026-06-01T10:00:00.000Z'),
        description: 'Legacy time log',
      }],
      unsupportedMetadata: expect.objectContaining({
        task: { id: 'task-1', createdAt: 1_717_226_800_000, updatedAt: 1_717_252_000_000 },
        timeLogged: 1234,
      }),
    }));
  });

  it('rejects duplicate imported task names ignoring case and whitespace', () => {
    expect(() => adaptTaskImportRequest(
      [
        { name: 'Task A', timeLogs: [], tags: [] },
        { name: ' task a ', timeLogs: [], tags: [] },
      ],
      [],
      (task, name) => unsupportedMetadataService.readImportMetadata(task, name),
    )).toThrow('Import contains duplicate task names: task a.');
  });

  it('keeps missing tag intent and dedupes tag refs by normalized name', () => {
    const result = adaptTaskImportRequest(
      [{
        name: 'Task A',
        timeLogs: [],
        tags: [
          'new tag',
          { name: ' New Tag ' },
          { name: 'Existing' },
        ],
      }],
      [new Tag({ id: 'tag-1', name: 'Existing' })],
      (task, name) => unsupportedMetadataService.readImportMetadata(task, name),
    );

    expect(result.tasks[0]?.tags).toEqual([
      { name: 'new tag' },
      { name: 'Existing', existingTagId: 'tag-1' },
    ]);
  });
});
