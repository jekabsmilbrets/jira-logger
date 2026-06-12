import { adaptTask, adaptTasks } from './task.adapter';

describe('Shared Adapters task.adapter', () => {
  it('adapts one task with defaults', () => {
    const task = adaptTask({ id: '1', name: 'Task', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' } as any);
    expect(task.id).toBe('1');
    expect(task.name).toBe('Task');
    expect(task.timeLogs).toEqual([]);
    expect(task.tags).toEqual([]);
  });

  it('adapts many tasks', () => {
    expect(adaptTasks([{ id: '1', name: 'A', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' }] as any)).toHaveLength(1);
  });

  it('adapts optional nested values when present', () => {
    const task = adaptTask({
      id: '2',
      name: 'Task 2',
      description: 'D',
      lastTimeLog: { startTime: '2024-01-01T10:00:00.000Z', endTime: '2024-01-01T10:01:00.000Z' },
      timeLogs: [{ startTime: '2024-01-01T10:00:00.000Z', endTime: '2024-01-01T10:01:00.000Z' }],
      jiraWorkLogs: [{ started: '2024-01-01T00:00:00.000Z', timeSpentSeconds: 60 }],
      tags: [{ id: 't1', name: 'Tag 1' }],
      createdAt: '2024-01-01T00:00:00.000Z',
    } as any);

    expect(task.lastTimeLog).toBeTruthy();
    expect(task.timeLogs.length).toBe(1);
    expect(task.jiraWorkLogs.length).toBe(1);
    expect(task.tags.length).toBe(1);
  });
});
