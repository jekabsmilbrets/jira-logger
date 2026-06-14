import { fromWallClockDateInTimezone } from '@core/utils/timezone-date.utility';

import { JiraWorkLog } from './jira-work-log.model';
import { Tag } from './tag.model';
import { Task } from './task.model';
import { TimeLog } from './time-log.model';

describe('Shared Models task.model', () => {
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

  it('calculates logged time for specific date and empty collections', () => {
    const day1 = new TimeLog({ startTime: new Date('2024-01-01T10:00:00.000Z'), endTime: new Date('2024-01-01T10:00:30.000Z') } as any);
    const day2 = new TimeLog({ startTime: new Date('2024-01-02T10:00:00.000Z'), endTime: new Date('2024-01-02T10:00:10.000Z') } as any);
    const task = new Task({ timeLogs: [day1, day2] } as any);

    expect(task.calcTimeLoggedForDate(new Date('2024-01-01T00:00:00.000Z'))).toBe(30);
    expect(task.calcTimeLoggedForDate(new Date('2024-01-03T00:00:00.000Z'))).toBe(0);
    expect(task.calcTimeLogged([])).toBe(0);
  });

  it('calculates synced time for date and handles missing jira work logs', () => {
    const task = new Task({} as any);
    const syncedDay = new Date('2024-01-04T10:00:00.000Z');
    syncedDay.setHours(0, 0, 0, 0);
    task.jiraWorkLogs = [
      new JiraWorkLog({
        startTime: syncedDay,
        timeSpentSeconds: 120,
      } as any),
    ];

    expect(task.calcTimeSynced(new Date('2024-01-04T10:00:00.000Z'))).toBe(120);
    expect(task.calcTimeSynced(new Date('2024-01-05T10:00:00.000Z'))).toBe(0);
  });

  it('groups logged and synced time using the provided timezone instead of browser local time', () => {
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
      jiraWorkLogs: [
        new JiraWorkLog({
          startTime: new Date('2026-06-02T21:00:00.000Z'),
          timeSpentSeconds: 1800,
        } as any),
      ],
    } as any);

    expect(task.calcTimeLoggedForDate(june2InVienna, timezone)).toBe(1800);
    expect(task.calcTimeLoggedForDate(june3InVienna, timezone)).toBe(0);
    expect(task.calcTimeSynced(june2InVienna, timezone)).toBe(1800);
    expect(task.calcTimeSynced(june3InVienna, timezone)).toBe(0);
  });

  it('splits time logs by overlap with each timezone day instead of assigning all time to the start day', () => {
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

    expect(task.calcTimeLoggedForDate(new Date(2026, 5, 5), 'Europe/Vienna')).toBe(86340);
    expect(task.calcTimeLoggedForDate(new Date(2026, 5, 6), 'Europe/Vienna')).toBe(86340);
  });
});
