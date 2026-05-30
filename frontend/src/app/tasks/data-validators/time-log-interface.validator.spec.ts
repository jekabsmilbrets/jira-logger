import { describe, expect, it } from 'vitest';
import { validateTimeLogInterfaceData, validateTimeLogsInterfaceData } from './time-log-interface.validator';

describe('Tasks Data Validators time-log-interface.validator', () => {
  const start = new Date('2024-01-01T10:00:00.000Z');
  const end = new Date('2024-01-01T11:00:00.000Z');

  it('validates one time log payload', () => {
    const out = validateTimeLogInterfaceData({
      _startTime: start,
      _endTime: end,
      _description: 'x',
    });

    expect(out).toEqual({
      startTime: start,
      endTime: end,
      description: 'x',
    });
  });

  it('passes undefined optional fields through', () => {
    const out = validateTimeLogInterfaceData({ _startTime: start });
    expect(out.endTime).toBeUndefined();
    expect(out.description).toBeUndefined();
  });

  it('throws when _startTime is missing', () => {
    expect(() => validateTimeLogInterfaceData({})).toThrow('Missing Required field "_startTime" for Time Log!');
  });

  it('validates list of time logs', () => {
    const out = validateTimeLogsInterfaceData([
      { _startTime: start, _description: 'a' },
      { _startTime: end, _description: 'b' },
    ]);

    expect(out).toEqual([
      { startTime: start, endTime: undefined, description: 'a' },
      { startTime: end, endTime: undefined, description: 'b' },
    ]);
  });
});
