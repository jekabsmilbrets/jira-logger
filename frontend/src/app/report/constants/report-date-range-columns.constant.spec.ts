import { columns } from './report-date-range-columns.constant';

describe('Report Constants report-date-range-columns.constant', () => {
  it('exports expected column contract and callable cells', () => {
    expect(columns.length).toBeGreaterThan(0);

    const first = columns[0];
    expect(first.columnDef).toBe('name');
    expect(first.hidden).toBe(false);

    const task: any = {
      name: 'Task A',
      description: 'Desc',
      tags: [{ name: 'Tag1' }],
      lastTimeLogStartTime: new Date('2024-01-01T00:00:00.000Z'),
    };

    for (const c of columns) {
      if (typeof c.cell === 'function') {
        c.cell(task);
      }
      if (typeof c.footerCell === 'function') {
        c.footerCell([task]);
      }
    }
  });
});
