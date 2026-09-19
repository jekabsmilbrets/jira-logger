import { DateTime }              from 'luxon';

import type { TaskRow } from '@database/records.types';

import type { TasksService } from '@features/tasks/tasks.service';
import type { TasksStore }   from '@features/tasks/tasks.types';

import { ApiError } from '@http/api-error';

import type { TaskResponse } from '@shared/responses.types';
import { lastTimer }         from '@shared/timer.helpers';

import { parseDate }             from '@time/date.helpers';
import type { TimezoneProvider } from '@time/time.types';


export class ReportService {
  constructor(
    private readonly repository: TasksStore,
    private readonly tasks: Pick<TasksService, 'project'>,
    private readonly timezone: TimezoneProvider,
  ) {
  }

  public async list(
    query: URLSearchParams,
    allowEmpty = false,
  ): Promise<TaskResponse[]> {
    const zone: string = await this.timezone.userTimezone();

    for (const key of query.keys()) {
      if (/^(tags|name|date|startDate|endDate|hideUnreported)\[/.test(key)) {
        throw new ApiError(400, ['Bad Request']);
      }
    }

    const dates: Record<string, DateTime | null> = {};
    const errors: Record<string, string> = {};

    for (const field of ['date', 'startDate', 'endDate']) {
      try {
        dates[field] = parseDate(query.get(field), zone);
      } catch {
        errors[field] = `This value is not a valid ${ field === 'date' ? 'date' : 'date-time' } format.`;
      }
    }

    if (Object.keys(errors).length) {
      throw new ApiError(406, errors);
    }

    let range: [DateTime, DateTime] | undefined;
    const onlyDate: (
      value: string,
    ) => boolean = (
      value: string,
    ) => !/^\d+$/.test(value.trim()) && !/[:T]/.test(value);

    if (query.has('date') || (query.has('startDate') && query.has('endDate'))) {
      const start: DateTime = dates.date ?? dates.startDate ?? DateTime.now().setZone(zone);
      const end: DateTime = dates.date ?? dates.endDate ?? DateTime.now().setZone(zone);
      range = [query.has('date') || onlyDate(query.get('startDate') ?? '') ? start.startOf('day') : start.startOf('second'), query.has('date') || onlyDate(query.get('endDate') ?? '') ? end.endOf('day').startOf('second') : end.startOf('second')];
    }

    const tags: string[] = (query.get('tags') ?? '').split(',').map(
      (
        tag,
      ) => tag.trim(
      )).filter(
      (
        tag,
      ) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(tag,
      ));
    const rows: TaskRow[] = await this.repository.list({
      tags,
      name: query.get('name')?.trim(),
      range: range ? [range[0].toISO(), range[1].toISO()] : undefined
    });
    const tasks: TaskResponse[] = [];

    for (const row of rows) {
      const task: TaskResponse = await this.tasks.project(row, zone);

      if (range) {
        const [start, end] = range;
        task.timeLogs = task.timeLogs.filter(
          (
            timer,
          ) => Date.parse(timer.startTime!,
          ) <= +end && (timer.endTime === null || Date.parse(timer.endTime) >= +start));

        for (const timer of task.timeLogs) {
          if (Date.parse(timer.startTime!) < +start) {
            timer.originalStartTime = timer.startTime;
            timer.startTime = start.toFormat('yyyy-MM-dd\'T\'HH:mm:ssZZ');
            timer.manuallyModified = true;
          }

          if (timer.endTime && Date.parse(timer.endTime) > +end) {
            timer.originalEndTime = timer.endTime;
            timer.endTime = end.toFormat('yyyy-MM-dd\'T\'HH:mm:ssZZ');
            timer.manuallyModified = true;
          }
        }
      }

      task.lastTimeLog = lastTimer(task.timeLogs);

      if (/^(1|true|on|yes)$/i.test((query.get('hideUnreported') ?? '').trim()) && !task.timeLogs.length) {
        continue;
      }

      tasks.push(task);
    }

    if (!tasks.length && !allowEmpty) {
      throw new ApiError(404, ['Tasks not found']);
    }

    return tasks;
  }
}
