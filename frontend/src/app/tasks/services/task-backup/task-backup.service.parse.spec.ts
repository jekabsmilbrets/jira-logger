import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, expect, it } from 'vitest';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';

import { TaskBackupService } from './task-backup.service';

describe('TaskBackupService parse', () => {
  let service: TaskBackupService;

  const tagsServiceMock: { tags: ReturnType<typeof signal<Tag[]>> } = {
    tags: signal<Tag[]>([]),
  };

  beforeEach(() => {
    tagsServiceMock.tags = signal<Tag[]>([]);

    TestBed.configureTestingModule({
      providers: [
        TaskBackupService,
        { provide: TagsService, useValue: tagsServiceMock },
        { provide: TasksService, useValue: { allTasks: signal([]).asReadonly() } },
        { provide: TimeLogsService, useValue: {} },
        { provide: LoaderStateService, useValue: {} },
      ],
    });

    service = TestBed.inject(TaskBackupService);
  });

  const parse = (
    input: unknown,
    currentTags: Tag[] = [],
  ): TaskImportRequest => {
    tagsServiceMock.tags.set(currentTags);

    return service.parseTaskImportRequest(JSON.stringify(input));
  };

  it('parses version 2 import metadata and warnings', () => {
    const result = parse(
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
    const result = parse(
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

  it('resolves legacy ID-only Tag references to current Tag names', () => {
    const result = parse([{
      _name: 'Legacy task',
      _timeLogs: [],
      _tags: [{ _id: 'tag-1' }],
    }], [new Tag({ id: 'tag-1', name: 'Frontend' })]);

    expect(result.tasks[0]?.tags).toEqual([{
      name: 'Frontend',
      existingTagId: 'tag-1',
    }]);
  });

  it('rejects duplicate imported task names ignoring case and whitespace', () => {
    expect(() => parse([
      { name: 'Task A', timeLogs: [], tags: [] },
      { name: ' task a ', timeLogs: [], tags: [] },
    ])).toThrow('Import contains duplicate task names: task a.');
  });

  it('keeps missing tag intent and dedupes tag refs by normalized name', () => {
    const result = parse(
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
    );

    expect(result.tasks[0]?.tags).toEqual([
      { name: 'new tag' },
      { name: 'Existing', existingTagId: 'tag-1' },
    ]);
  });

  it('rejects unsupported formats and malformed task entries', () => {
    expect(() => parse({ version: 1 })).toThrow('Unsupported task backup format.');
    expect(() => parse([null])).toThrow('Imported task must be an object.');
    expect(() => parse([{ tags: [], timeLogs: [] }]))
      .toThrow('Missing required field "name" for imported task.');
    expect(() => parse([{ name: 'Task', timeLogs: [] }]))
      .toThrow('Missing required field "tags" for imported task.');
  });

  it('validates malformed tag references and normalizes null optional text', () => {
    expect(() => parse([{ name: 'Task', tags: [1], timeLogs: [] }]))
      .toThrow('Imported tag reference must be a string or object.');
    expect(() => parse([{ name: 'Task', tags: [{}], timeLogs: [] }]))
      .toThrow('Imported tag reference must include a name when the tag does not exist locally.');
    expect(parse([{ name: 'Task', description: null, tags: [], timeLogs: [] }]).tasks[0])
      .toMatchObject({ name: 'Task', description: undefined, tags: [] });
  });
});
