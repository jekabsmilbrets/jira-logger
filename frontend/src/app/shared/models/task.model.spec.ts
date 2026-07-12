import { afterEach, vi } from 'vitest';

import { fromWallClockDateInTimezone } from '@core/utilities/timezone-date.utility';

import { Tag } from './tag.model';
import { Task } from './task.model';
import { TimeLog } from './time-log.model';

describe('Shared Models task.model', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it('calculates total logged time', () => {
    const t1 = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z'), endTime: new Date('2024-01-01T10:00:10.000Z') } as any);
    const t2 = new TimeLog({ startTime: new Date('2024-01-01T10:01:00.000Z'), endTime: new Date('2024-01-01T10:01:10.000Z') } as any);
    const task = new Task({ id: '1', name: 'x', timeLogs: [t1, t2] } as any);

    expect(task.timeLogged).toBe(20);
    expect(task.updateTimeLogged()).toBe(20);
  });

  it('adds/removes unique tags', () => {
    const tag = new Tag({ id: '1', name: 'a' } as any);
    const task = new Task({ tags: [] } as any);
    task.addTag(tag);
    task.addTag(tag);
    expect(task.tags).toHaveLength(1);

    task.removeTag(tag);
    expect(task.tags).toHaveLength(0);
  });

  it('clones mutable arrays on set/get boundaries', () => {
    const tag = new Tag({ id: '1', name: 'a' } as any);
    const timeLog = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z') } as any);
    const tags = [tag];
    const timeLogs = [timeLog];
    const task = new Task({ tags, timeLogs } as any);

    tags.push(new Tag({ id: '2', name: 'b' } as any));
    timeLogs.push(new TimeLog({ startTime: new Date('2024-01-01T11:00:00.000Z') } as any));

    const readTags = task.tags;
    readTags.push(new Tag({ id: '3', name: 'c' } as any));

    expect(task.tags).toHaveLength(1);
    expect(task.timeLogs).toHaveLength(1);
  });

  it('computes running state and lastTimeLogStartTime', () => {
    const running = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z') } as any);
    const stopped = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z'), endTime: new Date('2024-01-01T11:00:00.000Z') } as any);
    const task = new Task({ timeLogs: [running] } as any);

    task.lastTimeLog = running;
    expect(task.isTimeLogRunning).toBe(true);
    expect(task.lastTimeLogStartTime instanceof Date).toBe(true);

    task.lastTimeLog = stopped;
    expect(task.isTimeLogRunning).toBe(false);

    task.lastTimeLog = undefined;
    expect(task.lastTimeLogStartTime).toBeNull();
  });

  it('handles empty setters, epoch logs, and non-existent tags', () => {
    const epochLog = new TimeLog({ startTime: new Date(0), endTime: new Date(1_000) } as any);
    const task = new Task({ timeLogs: [epochLog] } as any);

    task.jiraWorkLogs = undefined as any;
    task.timeLogs = undefined as any;
    task.tags = undefined as any;
    task.lastTimeLog = epochLog;
    task.removeTag(new Tag({ id: 'missing', name: 'missing' } as any));

    expect(task.jiraWorkLogs).toEqual([]);
    expect(task.timeLogs).toEqual([]);
    expect(task.tags).toEqual([]);
    expect(task.lastTimeLogStartTime).toBeNull();
    expect(task.calcTimeLogged([epochLog])).toBe(0);
  });

  it('returns zero for logs outside a requested day', () => {
    const task = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2024-01-03T10:00:00.000Z'),
        endTime: new Date('2024-01-03T11:00:00.000Z'),
      } as any)],
    } as any);

    expect(task.calcTimeLoggedForDate(new Date('2024-01-01T12:00:00.000Z'))).toBe(0);
  });

  it('calculates logged time for specific date and empty collections', () => {
    const day1 = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z'), endTime: new Date('2024-01-01T10:00:30.000Z') } as any);
    const day2 = new TimeLog({ startTime: new Date('2024-01-02T10:00:00.000Z'), endTime: new Date('2024-01-02T10:00:10.000Z') } as any);
    const task = new Task({ timeLogs: [day1, day2] } as any);

    expect(task.calcTimeLoggedForDate(new Date('2024-01-01T00:00:00.000Z'))).toBe(30);
    expect(task.calcTimeLoggedForDate(new Date('2024-01-03T00:00:00.000Z'))).toBe(0);
    expect(task.calcTimeLogged([])).toBe(0);
  });

  it('groups logged time using the provided timezone instead of browser local time', () => {
    const timezone = 'Europe/Vienna';
    const june2InVienna = fromWallClockDateInTimezone(new Date(2026, 5, 2, 12, 0, 0), timezone);
    const june3InVienna = fromWallClockDateInTimezone(new Date(2026, 5, 3, 12, 0, 0), timezone);
    const task = new Task({
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-06-02T21:30:00.000Z'),
          endTime: new Date('2026-06-02T22:00:00.000Z'),
        } as any),
      ],
    } as any);

    expect(task.calcTimeLoggedForDate(june2InVienna, timezone)).toBe(1800);
    expect(task.calcTimeLoggedForDate(june3InVienna, timezone)).toBe(0);
  });

  it('splits time logs by overlap with each timezone day instead of assigning all time to the start day', () => {
    const timezone = 'Europe/Vienna';
    const june5InVienna = fromWallClockDateInTimezone(new Date(2026, 5, 5, 12), timezone);
    const june6InVienna = fromWallClockDateInTimezone(new Date(2026, 5, 6, 12), timezone);
    const task = new Task({
      timeLogs: [
        new TimeLog({
          startTime: new Date('2026-06-04T22:00:00.000Z'),
          endTime: new Date('2026-06-05T21:59:00.000Z'),
        } as any),
        new TimeLog({
          startTime: new Date('2026-06-05T22:00:00.000Z'),
          endTime: new Date('2026-06-06T21:59:00.000Z'),
        } as any),
      ],
    } as any);

    expect(task.calcTimeLoggedForDate(june5InVienna, timezone)).toBe(86340);
    expect(task.calcTimeLoggedForDate(june6InVienna, timezone)).toBe(86340);
  });

  it('calculates running logs against the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T10:01:00.000Z'));
    const running = new TimeLog({ startTime: new Date('2026-06-03T10:00:00.000Z'), endTime: undefined } as any);
    const task = new Task({ timeLogs: [running] } as any);
    task.lastTimeLog = running;

    expect(task.updateTimeLogged()).toBe(60);
    expect(task.calcTimeLoggedForDate(new Date('2026-06-03T12:00:00.000Z'))).toBe(60);
  });
});
