import { reportDateRangeColumns } from './report-date-range-columns.constant';

describe('Report Constants report-date-range-columns.constant', () => {
  it('exports expected column contract and callable cells', () => {
    expect(reportDateRangeColumns.length).toBeGreaterThan(0);

    const first = reportDateRangeColumns[0];
    expect(first.columnDef).toBe('name');
    expect(first.hidden).toBe(false);

    const task: any = {
      name: 'Task A',
      description: 'Desc',
      tags: [{ name: 'Tag1' }],
      lastTimeLogStartTime: new Date('2024-01-01T00:00:00.000Z'),
    };

    for (const c of reportDateRangeColumns) {
      if (typeof c.cell === 'function') {
        c.cell(task);
      }
      if (typeof c.footerCell === 'function') {
        c.footerCell([task]);
      }
    }
  });
});
