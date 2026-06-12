import { adaptJiraWorkLog, adaptJiraWorkLogs } from './jira-work-log.adapter';

describe('Shared Adapters jira-work-log.adapter', () => {
  it('adapts one jira work log', () => {
    const log = adaptJiraWorkLog({
      id: '1',
      workLogId: 'wl-1',
      description: 'desc',
      startTime: '2024-01-01T00:00:00.000Z',
      timeSpentSeconds: 120,
    } as any);

    expect(log.workLogId).toBe('wl-1');
    expect(log.timeSpentSeconds).toBe(120);
  });

  it('adapts many jira work logs', () => {
    expect(adaptJiraWorkLogs([{
      id: '1',
      workLogId: 'w',
      description: '',
      startTime: '2024-01-01T00:00:00.000Z',
      timeSpentSeconds: 1,
    }] as any)).toHaveLength(1);
  });
});
