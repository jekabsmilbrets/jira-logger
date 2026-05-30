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
});
