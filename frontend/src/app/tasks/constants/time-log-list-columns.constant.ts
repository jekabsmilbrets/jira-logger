import { formatDateInTimezone } from '@core/utilities/format-date-in-timezone.utility';

import { Column } from '@shared/interfaces/column.interface';
import { TimeLog } from '@shared/models/time-log.model';
import { columnValue } from '@shared/utilities/column-value.utility';

export const createTimeLogListColumns: (
  getLocale: () => string,
  getTimezone: () => string,
) => Column[] = (
  getLocale: () => string,
  getTimezone: () => string,
): Column[] => [
  {
    columnDef: 'uuid',
    header: 'uuid',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'uuid'),
  },
  {
    columnDef: 'description',
    header: 'Description',
    sortable: true,
    hidden: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'description'),
    hasFooter: true,
    footerCell: () => 'Total',
  },
  {
    columnDef: 'startTime',
    header: 'Start time',
    sortable: true,
    hidden: false,
    isClickable: true,
    cell: (timeLog: TimeLog) => timeLog.startTime && formatDateInTimezone(timeLog.startTime, 'yyyy-MM-dd H:mm:s', getLocale(), getTimezone()),
  },
  {
    columnDef: 'endTime',
    header: 'End time',
    sortable: true,
    hidden: false,
    isClickable: true,
    cell: (timeLog: TimeLog) => timeLog.endTime && formatDateInTimezone(timeLog.endTime, 'yyyy-MM-dd H:mm:s', getLocale(), getTimezone()),
  },
  {
    columnDef: 'date',
    header: 'Date',
    sortable: true,
    hidden: false,
    cell: (timeLog: TimeLog) => timeLog.date && formatDateInTimezone(timeLog.date, 'yyyy-MM-dd', getLocale(), getTimezone()),
  },
  {
    columnDef: 'year',
    header: 'year',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'year'),
  },
  {
    columnDef: 'month',
    header: 'month',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'month'),
  },
  {
    columnDef: 'day',
    header: 'day',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'day'),
  },
  {
    columnDef: 'hour',
    header: 'hour',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'hour'),
  },
  {
    columnDef: 'minute',
    header: 'minute',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'minute'),
  },
  {
    columnDef: 'second',
    header: 'second',
    sortable: true,
    hidden: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'second'),
  },
  {
    columnDef: 'timeLogged',
    header: 'Time logged',
    sortable: false,
    hidden: false,
    pipe: 'readableTime',
    cell: (timeLog: TimeLog) => timeLog.timeLogged(),
    hasFooter: true,
    footerCell: (timeLogs: TimeLog[]) => timeLogs.map(
      (t) => t.timeLogged(),
    )
      .reduce(
        (acc, value) => acc + value,
        0,
      ),
  },
];
