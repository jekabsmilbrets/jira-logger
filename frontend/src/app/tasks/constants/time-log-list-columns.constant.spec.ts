import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { TimeLog } from '@shared/models/time-log.model';

import { createTimeLogListColumns } from './time-log-list-columns.constant';

describe('Tasks Constants time-log-list-columns.constant', () => {
  beforeAll(() => {
    registerLocaleData(localeLv, 'lv-LV');
  });

  it('exports expected columns and callable accessors', () => {
    const columns = createTimeLogListColumns(
      () => 'lv-LV',
      () => 'Europe/Riga',
    );

    expect(columns.length).toBeGreaterThan(0);

    const timeLog = new TimeLog({
      startTime: new Date('2024-01-01T10:00:00.000Z'),
      endTime: new Date('2024-01-01T10:01:00.000Z'),
      description: 'desc',
    } as any);

    for (const c of columns) {
      if (typeof c.cell === 'function') {
        c.cell(timeLog);
      }
      if (typeof c.footerCell === 'function') {
        c.footerCell([timeLog]);
      }
    }

    const logged = columns.find((c) => c.columnDef === 'timeLogged');
    expect(logged?.footerCell?.([timeLog])).toBe(60);
  });
});
