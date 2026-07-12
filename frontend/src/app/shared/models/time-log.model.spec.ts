import { TimeLog } from './time-log.model';

describe('Shared Models time-log.model', () => {
  it('exposes date parts and timeLogged', () => {
    const start = new Date('2024-01-01T10:00:00.000Z');
    const end = new Date('2024-01-01T10:01:30.000Z');
    const log = new TimeLog({ startTime: start, endTime: end, description: 'x' } as any);

    expect(log.date.getTime()).toBe(start.getTime());
    expect(log.timeLogged()).toBe(90);
  });

  it('returns 0 when not finished', () => {
    const log = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z') } as any);
    expect(log.timeLogged()).toBe(0);
  });

  it('exposes all calendar parts and supports clearing end time', () => {
    const log = new TimeLog({
      startTime: new Date('2024-02-03T04:05:06.000Z'),
      endTime: new Date('2024-02-03T04:05:07.001Z'),
    } as any);

    expect(log.year).toBe(2024);
    expect(log.month).toBe(2);
    expect(log.day).toBe(3);
    expect(log.hour).toBe(6);
    expect(log.minute).toBe(5);
    expect(log.second).toBe(6);
    expect(log.timeLogged()).toBe(2);

    log.endTime = undefined;
    expect(log.endTime).toBeUndefined();
  });
});
