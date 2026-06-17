import { describe, expect, it } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { TaskBackupService } from './task-backup.service';

describe('Tasks Services task-backup.service', () => {
  const service: TaskBackupService = new TaskBackupService();

  it('exports canonical task backup v2', () => {
    const task = new Task({
      id: 'task-1',
      name: 'Exported task',
      description: 'Desc',
      timeLogs: [new TimeLog({ startTime: new Date('2026-01-01T10:00:00.000Z'), endTime: new Date('2026-01-01T10:00:00.000Z') })],
      tags: [new Tag({ id: 'tag-1', name: 'Frontend' })],
    });

    const backup = service.createTaskBackupV2([task]);

    expect(backup.version).toBe(2);
    expect(backup.tasks).toEqual([
      {
        name: 'Exported task',
        description: 'Desc',
        timeLogs: [{
          startTime: Date.parse('2026-01-01T10:00:00.000Z'),
          endTime: Date.parse('2026-01-01T10:00:00.000Z'),
          description: null,
        }],
        tags: [{ id: 'tag-1', name: 'Frontend' }],
        metadata: {
          task: { id: 'task-1', createdAt: undefined, updatedAt: undefined },
          timeLogs: [],
          tags: [{ id: 'tag-1', createdAt: undefined, updatedAt: undefined }],
          lastTimeLog: undefined,
          jiraWorkLogs: undefined,
          timeLogged: 0,
        },
      },
    ]);
  });

  it('accepts legacy underscore backups and preserves unsupported metadata as warnings', () => {
    const request = service.prepareTaskImportRequest(
      [{
        _id: 'task-1',
        _name: 'Imported task',
        _description: 'Desc',
        _timeLogs: [{ _startTime: 1000, _endTime: 2000, description: 'Worked' }],
        _tags: [{ _name: 'Frontend' }],
        _timeLogged: 1,
      }],
      [],
      [],
    );

    expect(request.tasks).toEqual([{
      name: 'Imported task',
      description: 'Desc',
      timeLogs: [{ startTime: 1000, endTime: 2000, description: 'Worked' }],
      tags: ['Frontend'],
      unsupportedMetadata: {
        task: { id: 'task-1', createdAt: undefined, updatedAt: undefined },
        timeLogs: undefined,
        tags: undefined,
        lastTimeLog: undefined,
        jiraWorkLogs: undefined,
        timeLogged: 1,
      },
    }]);
    expect(request.warnings).toHaveLength(1);
  });

  it('accepts current api-style task JSON and resolves existing tags by id', () => {
    const request = service.prepareTaskImportRequest(
      [{
        name: 'Current task',
        description: 'Desc',
        timeLogs: [{ startTime: '2026-01-01T10:00:00.000Z', endTime: '2026-01-01T11:00:00.000Z', description: 'Worked' }],
        tags: [{ id: 'tag-1', name: 'frontend' }],
      }],
      [],
      [new Tag({ id: 'tag-1', name: 'Frontend' })],
    );

    expect(request.tasks[0]).toEqual({
      name: 'Current task',
      description: 'Desc',
      timeLogs: [{
        startTime: Date.parse('2026-01-01T10:00:00.000Z'),
        endTime: Date.parse('2026-01-01T11:00:00.000Z'),
        description: 'Worked',
      }],
      tags: ['Frontend'],
      unsupportedMetadata: {
        task: undefined,
        timeLogs: undefined,
        tags: [{ id: 'tag-1', createdAt: undefined, updatedAt: undefined }],
        lastTimeLog: undefined,
        jiraWorkLogs: undefined,
        timeLogged: undefined,
      },
    });
  });

  it('fails preflight when imported task names already exist locally', () => {
    expect(() => service.prepareTaskImportRequest(
      [{
        name: 'Existing task',
        timeLogs: [],
        tags: [],
      }],
      [new Task({ id: 'existing', name: 'Existing task', timeLogs: [], tags: [] })],
      [],
    )).toThrow('already exist');
  });

  it('accepts the session-start import payload and preserves importable data', () => {
    const request = service.prepareTaskImportRequest(
      [
        {
          _id: '5640e2d4-eff2-4f53-8e71-8cd305530f7f',
          _name: 'test',
          _description: null,
          _lastTimeLog: {
            _id: '493cbe6c-af2b-402c-903d-e3ab74dd3f22',
            description: null,
            _endTime: 1781304420000,
            _startTime: 1781304403000,
          },
          _timeLogs: [
            {
              _id: '516607ae-b36b-4020-9b45-27b5aba7f037',
              description: null,
              _endTime: 1781279340000,
              _startTime: 1781279280000,
            },
            {
              _id: '7a91705e-7d27-45b2-92ca-fefa79d8290e',
              description: null,
              _endTime: 1781279432000,
              _startTime: 1781279310000,
            },
            {
              _id: '8599e44a-9d0f-414b-9dd9-918586140008',
              description: null,
              _endTime: 1781284874000,
              _startTime: 1781284872000,
            },
            {
              _id: 'ce31d989-5dca-43b9-b854-fb828a4a6c0e',
              description: null,
              _endTime: 1781284879000,
              _startTime: 1781284877000,
            },
            {
              _id: 'a52052d4-8480-4b9e-9a00-7b8b6d20e22f',
              description: null,
              _endTime: 1781298114000,
              _startTime: 1781297978000,
            },
            {
              _id: '493cbe6c-af2b-402c-903d-e3ab74dd3f22',
              description: null,
              _endTime: 1781304420000,
              _startTime: 1781304403000,
            },
          ],
          _jiraWorkLogs: [],
          _timeLogged: 339,
          _tags: [
            {
              _id: '844e4fcb-2c26-4111-b8d7-da302f2ebbb7',
              _createdAt: 1781275774000,
              _updatedAt: 1781304383000,
              name: 'CAPEX',
            },
          ],
        },
      ],
      [],
      [],
    );

    expect(request.tasks).toEqual([
      {
        name: 'test',
        description: undefined,
        timeLogs: [
          { startTime: 1781279280000, endTime: 1781279340000, description: undefined },
          { startTime: 1781279310000, endTime: 1781279432000, description: undefined },
          { startTime: 1781284872000, endTime: 1781284874000, description: undefined },
          { startTime: 1781284877000, endTime: 1781284879000, description: undefined },
          { startTime: 1781297978000, endTime: 1781298114000, description: undefined },
          { startTime: 1781304403000, endTime: 1781304420000, description: undefined },
        ],
        tags: ['CAPEX'],
        unsupportedMetadata: {
          task: { id: '5640e2d4-eff2-4f53-8e71-8cd305530f7f', createdAt: undefined, updatedAt: undefined },
          timeLogs: [
            { id: '516607ae-b36b-4020-9b45-27b5aba7f037', createdAt: undefined, updatedAt: undefined },
            { id: '7a91705e-7d27-45b2-92ca-fefa79d8290e', createdAt: undefined, updatedAt: undefined },
            { id: '8599e44a-9d0f-414b-9dd9-918586140008', createdAt: undefined, updatedAt: undefined },
            { id: 'ce31d989-5dca-43b9-b854-fb828a4a6c0e', createdAt: undefined, updatedAt: undefined },
            { id: 'a52052d4-8480-4b9e-9a00-7b8b6d20e22f', createdAt: undefined, updatedAt: undefined },
            { id: '493cbe6c-af2b-402c-903d-e3ab74dd3f22', createdAt: undefined, updatedAt: undefined },
          ],
          tags: [
            { id: '844e4fcb-2c26-4111-b8d7-da302f2ebbb7', createdAt: 1781275774000, updatedAt: 1781304383000 },
          ],
          lastTimeLog: {
            startTime: 1781304403000,
            endTime: 1781304420000,
            description: undefined,
          },
          jiraWorkLogs: undefined,
          timeLogged: 339,
        },
      },
    ]);
    expect(request.warnings).toHaveLength(1);
    expect(request.warnings[0]?.fields).toEqual([
      'source task metadata',
      'source time log metadata',
      'source tag metadata',
      'lastTimeLog',
      'timeLogged',
    ]);
  });

  it('accepts canonical version 2 backup payload and preserves importable data', () => {
    const request = service.prepareTaskImportRequest(
      {
        version: 2,
        exportedAt: 1781726798007,
        tasks: [
          {
            name: 'test3',
            description: '',
            timeLogs: [
              {
                startTime: 1781535472000,
                endTime: 1781535940000,
                description: null,
              },
              {
                startTime: 1781550590000,
                endTime: 1781622255000,
                description: null,
              },
              {
                startTime: 1781464070000,
                endTime: 1781464144000,
                description: null,
              },
            ],
            tags: [
              {
                id: '285a807b-5f39-4e9d-9a1e-bff64b46f323',
                name: 'OPEX',
              },
            ],
            metadata: {
              task: {
                id: '29036341-5ded-402d-b1de-edc62dd8d2fa',
              },
              timeLogs: [
                {
                  id: '3009b04c-cdfc-4b7a-8650-fddac3c76446',
                },
                {
                  id: 'e6b1d6eb-9000-44a5-a864-f8219b065924',
                },
                {
                  id: 'be26d44e-4da6-40db-98bd-f6ae6fe45c62',
                },
              ],
              tags: [
                {
                  id: '285a807b-5f39-4e9d-9a1e-bff64b46f323',
                  createdAt: 1781275774000,
                  updatedAt: 1781630184000,
                },
              ],
              lastTimeLog: {
                startTime: 1781550590000,
                endTime: 1781622255000,
                description: null,
              },
              timeLogged: 72207,
            },
          },
        ],
      },
      [],
      [],
    );

    expect(request.tasks).toEqual([
      {
        name: 'test3',
        description: '',
        timeLogs: [
          { startTime: 1781535472000, endTime: 1781535940000, description: undefined },
          { startTime: 1781550590000, endTime: 1781622255000, description: undefined },
          { startTime: 1781464070000, endTime: 1781464144000, description: undefined },
        ],
        tags: ['OPEX'],
        unsupportedMetadata: {
          task: {
            id: '29036341-5ded-402d-b1de-edc62dd8d2fa',
            createdAt: undefined,
            updatedAt: undefined,
          },
          timeLogs: [
            { id: '3009b04c-cdfc-4b7a-8650-fddac3c76446', createdAt: undefined, updatedAt: undefined },
            { id: 'e6b1d6eb-9000-44a5-a864-f8219b065924', createdAt: undefined, updatedAt: undefined },
            { id: 'be26d44e-4da6-40db-98bd-f6ae6fe45c62', createdAt: undefined, updatedAt: undefined },
          ],
          tags: [
            {
              id: '285a807b-5f39-4e9d-9a1e-bff64b46f323',
              createdAt: 1781275774000,
              updatedAt: 1781630184000,
            },
          ],
          lastTimeLog: {
            startTime: 1781550590000,
            endTime: 1781622255000,
            description: undefined,
          },
          jiraWorkLogs: undefined,
          timeLogged: 72207,
        },
      },
    ]);
    expect(request.warnings).toHaveLength(1);
    expect(request.warnings[0]?.fields).toEqual([
      'source task metadata',
      'source time log metadata',
      'source tag metadata',
      'lastTimeLog',
      'timeLogged',
    ]);
  });
});
