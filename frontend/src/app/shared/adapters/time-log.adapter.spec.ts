import { adaptTimeLog, adaptTimeLogs } from './time-log.adapter';

describe('Shared Adapters time-log.adapter', () => {
  it('adapts one time log', () => {
    const log = adaptTimeLog({
      id: '1',
      startTime: '2024-01-01T10:00:00.000Z',
      endTime: '2024-01-01T11:00:00.000Z',
      description: 'x',
    } as any);

    expect(log.id).toBe('1');
    expect(log.description).toBe('x');
  });

  it('adapts many time logs', () => {
    expect(adaptTimeLogs([{ id: '1', startTime: '2024-01-01T10:00:00.000Z' }] as any)).toHaveLength(1);
  });
});
