import { describe, expect, it } from 'vitest';

import { Task } from '@shared/models/task.model';

import { reportTotalColumns } from './report-total-columns.constant';

describe('reportTotalColumns', () => {
  it('exposes a readable total-time column with row and footer values', () => {
    const column = reportTotalColumns.find(({ columnDef }) => columnDef === 'timeLogged');
    const firstTask = { timeLogged: 60 } as Task;
    const secondTask = { timeLogged: 90 } as Task;

    expect(column).toMatchObject({
      header: 'Total Time Logged',
      stickyEnd: true,
      pipe: 'readableTime',
      hasFooter: true,
    });
    expect(column?.cell(firstTask)).toBe(60);
    expect(column?.footerCell?.([firstTask, secondTask])).toBe(150);
  });
});
