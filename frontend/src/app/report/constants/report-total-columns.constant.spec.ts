import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { columns } from './report-total-columns.constant';

describe('Report Constants report-total-columns.constant', () => {
  it('exports expected column contract and computes footer totals', () => {
    expect(columns.length).toBeGreaterThan(0);

    const timeLog = new TimeLog({
      startTime: new Date('2024-01-01T10:00:00.000Z'),
      endTime: new Date('2024-01-01T10:01:00.000Z'),
    } as any);

    const task = new Task({
      name: 'Task A',
      description: 'Desc',
      tags: [{ name: 'Tag1' } as any],
      timeLogs: [timeLog],
    } as any);

    for (const c of columns) {
      if (typeof c.cell === 'function') {
        c.cell(task);
      }
      if (typeof c.footerCell === 'function') {
        c.footerCell([task]);
      }
    }

    const timeLoggedCol = columns.find((c) => c.columnDef === 'timeLogged');
    expect(timeLoggedCol?.footerCell?.([task])).toBe(60);
  });
});
