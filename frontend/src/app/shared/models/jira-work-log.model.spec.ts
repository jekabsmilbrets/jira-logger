import { JiraWorkLog } from './jira-work-log.model';

describe('Shared Models jira-work-log.model', () => {
  it('assigns properties from constructor data', () => {
    const item = new JiraWorkLog({ id: '1', workLogId: 'wl-1', description: 'x', timeSpentSeconds: 10 } as any);
    expect(item.id).toBe('1');
    expect(item.workLogId).toBe('wl-1');
  });
});
