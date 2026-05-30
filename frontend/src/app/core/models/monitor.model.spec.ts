import { Monitor } from './monitor.model';

describe('Core Models monitor.model', () => {
  it('assigns provided properties', () => {
    const time = new Date('2024-01-01T00:00:00.000Z');
    const monitor = new Monitor({ time, message: 'ok' });

    expect(monitor.time).toBe(time);
    expect(monitor.message).toBe('ok');
  });

  it('supports empty constructor data', () => {
    const monitor = new Monitor();

    expect(monitor).toBeInstanceOf(Monitor);
  });
});
