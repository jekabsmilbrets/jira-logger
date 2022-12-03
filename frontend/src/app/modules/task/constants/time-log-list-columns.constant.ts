import { formatDate } from '@angular/common';

import { appLocale, appTimeZone } from '@core/constants/date-time.constant';

import { Column } from '@shared/interfaces/column.interface';

import { TimeLog }     from '@shared/models/time-log.model';
import { columnValue } from '@shared/utils/column-value.util';


export const columns: Column[] = [
  {
    columnDef: 'uuid',
    header: 'uuid',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'uuid'),
  },
  {
    columnDef: 'description',
    header: 'Description',
    sortable: true,
    visible: true,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'description'),
    hasFooter: true,
    footerCell: () => 'Total',
  },
  {
    columnDef: 'startTime',
    header: 'Start time',
    sortable: true,
    visible: true,
    isClickable: true,
    cell: (timeLog: TimeLog) => timeLog.startTime && formatDate(timeLog.startTime, 'yyyy-MM-dd H:mm:s', appLocale, appTimeZone),
  },
  {
    columnDef: 'endTime',
    header: 'End time',
    sortable: true,
    visible: true,
    isClickable: true,
    cell: (timeLog: TimeLog) => timeLog.endTime && formatDate(timeLog.endTime, 'yyyy-MM-dd H:mm:s', appLocale, appTimeZone),
  },
  {
    columnDef: 'date',
    header: 'Date',
    sortable: true,
    visible: true,
    cell: (timeLog: TimeLog) => timeLog.date && formatDate(timeLog.date, 'yyyy-MM-dd', appLocale, appTimeZone),
  },
  {
    columnDef: 'year',
    header: 'year',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'year'),
  },
  {
    columnDef: 'month',
    header: 'month',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'month'),
  },
  {
    columnDef: 'day',
    header: 'day',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'day'),
  },
  {
    columnDef: 'hour',
    header: 'hour',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'hour'),
  },
  {
    columnDef: 'minute',
    header: 'minute',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'minute'),
  },
  {
    columnDef: 'second',
    header: 'second',
    sortable: true,
    visible: false,
    cell: (timeLog: TimeLog) => columnValue(timeLog, 'second'),
  },
  {
    columnDef: 'timeLogged',
    header: 'Time logged',
    sortable: false,
    visible: true,
    pipe: 'readableTime',
    cell: (timeLog: TimeLog) => timeLog.timeLogged(),
    hasFooter: true,
    footerCell: (timeLogs: TimeLog[]) => timeLogs.map(t => t.timeLogged())
      .reduce((acc, value) => acc + value, 0),
  },
];
