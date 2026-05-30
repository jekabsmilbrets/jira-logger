import { describe, expect, it } from 'vitest';

import { buildTaskUpdatePayload, buildTimeLogPayload } from './task-payload-builder.util';

describe('Tasks Utils task-payload-builder.util', () => {
  const sourceTags = [
    { id: '1', name: 'Backend' },
    { id: '2', name: 'Frontend' },
  ] as any;

  const sourceTimeLogs = [
    { startTime: new Date('2024-01-01T10:00:00.000Z') },
  ] as any;

  const sourceTask = {
    id: 'task-1' as any,
    name: 'Source name',
    description: 'Source description',
    tags: sourceTags,
    timeLogs: sourceTimeLogs,
    jiraWorkLogs: [{ id: 'wl-1' } as any],
  } as any;

  it('buildTaskUpdatePayload updates provided fields and preserves immutable clones', () => {
    const updatedTags = [{ id: '3', name: 'Ops' }] as any;

    const out = buildTaskUpdatePayload(sourceTask, {
      name: 'Updated name',
      description: 'Updated description',
      tags: updatedTags,
    });

    expect(out.name).toBe('Updated name');
    expect(out.description).toBe('Updated description');
    expect(out.tags).toEqual(updatedTags);
    expect(out.tags).not.toBe(updatedTags);
    expect(out.timeLogs).toEqual(sourceTask.timeLogs);
    expect(out.timeLogs).not.toBe(sourceTask.timeLogs);
    expect(out.jiraWorkLogs).toEqual(sourceTask.jiraWorkLogs);
    expect(out.jiraWorkLogs).not.toBe(sourceTask.jiraWorkLogs);
  });

  it('buildTaskUpdatePayload falls back to source values for non-string name/description and non-array tags', () => {
    const out = buildTaskUpdatePayload(sourceTask, {
      name: null,
      description: null,
      tags: null,
    });

    expect(out.name).toBe(sourceTask.name);
    expect(out.description).toBe(sourceTask.description);
    expect(out.tags).toBe(sourceTask.tags);
  });

  it('buildTimeLogPayload applies form values and maps nullable end/description to undefined', () => {
    const source = {
      startTime: new Date('2024-01-01T10:00:00.000Z'),
      endTime: new Date('2024-01-01T12:00:00.000Z'),
      description: 'before',
    } as any;
    const nextStart = new Date('2024-01-01T09:00:00.000Z');

    const out = buildTimeLogPayload(source, {
      startTime: nextStart,
      endTime: null,
      description: null,
    } as any);

    expect((out.startTime as Date).toISOString()).toBe(nextStart.toISOString());
    expect(out.endTime).toBeUndefined();
    expect(out.description).toBeUndefined();
  });

  it('buildTimeLogPayload keeps source start when form start is undefined', () => {
    const source = {
      startTime: new Date('2024-01-01T10:00:00.000Z'),
      endTime: new Date('2024-01-01T12:00:00.000Z'),
      description: 'before',
    } as any;

    const out = buildTimeLogPayload(source, {
      startTime: undefined,
      endTime: source.endTime,
      description: source.description,
    } as any);

    expect((out.startTime as Date).toISOString()).toBe((source.startTime as Date).toISOString());
    expect((out.endTime as Date | undefined)?.toISOString()).toBe((source.endTime as Date | undefined)?.toISOString());
    expect(out.description).toBe(source.description);
  });
});
