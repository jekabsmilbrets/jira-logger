import { reportBaseColumns } from './report-base-columns.constant';

describe('Report Constants report-base-columns.constant', () => {
  it('exports the shared base columns used by report variants', () => {
    expect(reportBaseColumns.map((column) => column.columnDef)).toEqual([
      'name',
      'description',
      'tags',
      'lastTimeLogStartTime',
    ]);

    const task: any = {
      name: 'Task A',
      description: 'Desc',
      tags: [{ name: 'Tag1' }],
      lastTimeLogStartTime: new Date('2024-01-01T00:00:00.000Z'),
    };

    expect(reportBaseColumns[0].footerCell?.([task])).toBe('Total');
    expect(reportBaseColumns[2].cell?.(task)).toEqual(['Tag1']);
  });
});
