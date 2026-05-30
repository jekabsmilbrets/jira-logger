import { Tag } from '@shared/models/tag.model';
import { describe, expect, it } from 'vitest';

import { validateTaskInterfaceData, validateTasksInterfaceData } from './task-interface.validator';

describe('Tasks Data Validators task-interface.validator', () => {
  const tags: Tag[] = [new Tag({ id: '1', name: 'Backend' })];
  const start = new Date('2024-01-01T10:00:00.000Z');

  it('validates a full task payload with mapped tags and time logs', () => {
    const out = validateTaskInterfaceData(
      {
        _name: 'Task',
        _description: 'Desc',
        _timeLogs: [{ _startTime: start, _endTime: start, _description: 'log' }],
        _tags: ['backend'],
      },
      tags,
    );

    expect(out).toEqual({
      name: 'Task',
      description: 'Desc',
      timeLogs: [{ startTime: start, endTime: start, description: 'log' }],
      tags: [{ id: '1', name: 'Backend' }],
    });
  });

  it('keeps falsy _timeLogs and _tags values as-is', () => {
    const out = validateTaskInterfaceData(
      {
        _name: 'Task',
        _timeLogs: null,
        _tags: null,
      },
      tags,
    );

    expect(out.timeLogs).toBeNull();
    expect(out.tags).toBeNull();
  });

  it('throws for each missing required field', () => {
    expect(() => validateTaskInterfaceData({ _timeLogs: [], _tags: [] }, tags)).toThrow('Missing Required field "_name" for Task!');
    expect(() => validateTaskInterfaceData({ _name: 'Task', _tags: [] }, tags)).toThrow('Missing Required field "_timeLogs" for Task!');
    expect(() => validateTaskInterfaceData({ _name: 'Task', _timeLogs: [] }, tags)).toThrow('Missing Required field "_tags" for Task!');
  });

  it('validates task arrays item-by-item', () => {
    const out = validateTasksInterfaceData([
      { _name: 'A', _timeLogs: [{ _startTime: start }], _tags: ['backend'] },
      { _name: 'B', _timeLogs: [{ _startTime: start }], _tags: ['missing'] },
    ], tags);

    expect(out).toHaveLength(2);
    expect(out[0].tags).toEqual([{ id: '1', name: 'Backend' }]);
    expect(out[1].tags).toEqual([]);
  });
});
