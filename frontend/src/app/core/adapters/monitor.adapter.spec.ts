import { adaptMonitor } from './monitor.adapter';

describe('Core Adapters monitor.adapter', () => {
  it('adapts monitor data', () => {
    const result = adaptMonitor({
      time: '2024-01-01T00:00:00.000Z',
      message: 'ok',
    });

    expect(result.time.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(result.message).toBe('ok');
  });
});
