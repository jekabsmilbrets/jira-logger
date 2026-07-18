import { afterEach, vi } from 'vitest';

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

  it('calculates the full overlap inside a half-open interval', () => {
    const task = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2024-01-01T10:00:00.000Z'),
        endTime: new Date('2024-01-01T10:00:30.000Z'),
      } as any)],
    } as any);

    expect(task.calcTimeLoggedBetween(
      new Date('2024-01-01T09:00:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
    )).toBe(30);
    expect(task.calcTimeLogged([])).toBe(0);
  });

  it('calculates only the partial overlap with an interval', () => {
    const task = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2024-01-01T09:59:30.000Z'),
        endTime: new Date('2024-01-01T10:00:30.000Z'),
      } as any)],
    } as any);

    expect(task.calcTimeLoggedBetween(
      new Date('2024-01-01T10:00:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
    )).toBe(30);
  });

  it('excludes logs adjacent to half-open interval boundaries', () => {
    const task = new Task({
      timeLogs: [
        new TimeLog({
          startTime: new Date('2024-01-01T09:00:00.000Z'),
          endTime: new Date('2024-01-01T10:00:00.000Z'),
        } as any),
        new TimeLog({
          startTime: new Date('2024-01-01T11:00:00.000Z'),
          endTime: new Date('2024-01-01T12:00:00.000Z'),
        } as any),
      ],
    } as any);

    expect(task.calcTimeLoggedBetween(
      new Date('2024-01-01T10:00:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
    )).toBe(0);
  });

  it('returns zero for no overlap and empty or reversed intervals', () => {
    const task = new Task({
      timeLogs: [new TimeLog({
        startTime: new Date('2024-01-03T10:00:00.000Z'),
        endTime: new Date('2024-01-03T11:00:00.000Z'),
      } as any)],
    } as any);

    expect(task.calcTimeLoggedBetween(
      new Date('2024-01-01T10:00:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
    )).toBe(0);
    expect(task.calcTimeLoggedBetween(
      new Date('2024-01-01T11:00:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
    )).toBe(0);
    expect(task.calcTimeLoggedBetween(
      new Date('2024-01-01T12:00:00.000Z'),
      new Date('2024-01-01T11:00:00.000Z'),
    )).toBe(0);
  });

  it('calculates running-log overlap against the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T10:01:00.000Z'));
    const running = new TimeLog({ startTime: new Date('2026-06-03T10:00:00.000Z'), endTime: undefined } as any);
    const task = new Task({ timeLogs: [running] } as any);
    task.lastTimeLog = running;

    expect(task.updateTimeLogged()).toBe(60);
    expect(task.calcTimeLoggedBetween(
      new Date('2026-06-03T10:00:00.000Z'),
      new Date('2026-06-03T11:00:00.000Z'),
    )).toBe(60);
  });
});
