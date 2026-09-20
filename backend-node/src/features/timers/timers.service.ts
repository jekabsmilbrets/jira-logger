import { randomUUID } from 'node:crypto';

import { DateTime }   from 'luxon';

import type { TimerRow } from '@database/records.types';

import type { TasksService } from '@features/tasks/tasks.service';
import type { TimersStore }  from '@features/timers/timers.types';

import { ApiError } from '@http/api-error';
import { uuid }     from '@http/http.constants';

import type { ResponseMapper }                                  from '@shared/response-mapper';
import type { TaskResponse, TimerResponse, TodayTotalResponse } from '@shared/responses.types';
import { stringFields }                                         from '@shared/validation';

import { parseDate, sqlDate }    from '@time/date.helpers';
import type { DateCodec }                                       from '@time/date-codec';
import type { TimezoneProvider } from '@time/time.types';


function scalar(
  value: unknown,
): string {
  return value === true ? '1' : value === false || value === null || typeof value === 'object' ? '' : String(value);
}

export class TimersService {
  constructor(
    private readonly repository: TimersStore,
    private readonly tasks: Pick<TasksService, 'get' | 'show'>,
    private readonly timezone: TimezoneProvider,
    private readonly dates: DateCodec,
    private readonly mapper: ResponseMapper,
  ) {
  }

  private async get(
    taskId: string,
    id: string,
    message = 'TimeLog not found',
  ): Promise<TimerRow> {
    const row: TimerRow | undefined = await this.repository.find(taskId, id);

    if (!row) {
      throw new ApiError(404, [message]);
    }

    return row;
  }

  public async save(
    input: Record<string, unknown>,
    taskId: string,
    id?: string,
  ): Promise<TimerResponse> {
    if (input.description != null) {
      stringFields(input, ['description']);
    }

    const zone: string = await this.timezone.userTimezone();
    const errors: Record<string, string> = {};
    let start: DateTime | null = null;
    let end: DateTime | null = null;
    const startInput: string = 'startTime' in input ? scalar(input.startTime) : '';

    if (!startInput) {
      errors.startTime = 'This value should not be blank.';
    }

    try {
      start = parseDate(startInput, zone);
    } catch {
      errors.startTime = 'This value is not a valid date-time format.';
    }

    try {
      end = parseDate('endTime' in input ? scalar(input.endTime) : null, zone);
    } catch {
      errors.endTime = 'This value is not a valid date-time format.';
    }

    if (typeof input.description === 'string' && [...input.description].length > 255) {
      errors.description = 'This value is too long. It should have 255 characters or less.';
    }

    if (!new RegExp(`^${ uuid }$`, 'i').test(taskId)) {
      errors.task = 'This is not a valid UUID.';
    }

    if (Object.keys(errors).length) {
      throw new ApiError(406, errors);
    }

    const old: TimerRow | undefined = id ? await this.get(taskId, id) : undefined;
    await this.tasks.get(taskId);

    try {
      const row: TimerRow = await this.repository.save({
        id: id ?? randomUUID(),
        taskId,
        start: start ? sqlDate(start) : old?.start_time ?? null,
        end: end ? sqlDate(end) : old?.end_time ?? null,
        description: typeof input.description === 'string' ? input.description : old?.description ?? null
      }, Boolean(id));

      return this.mapper.timer(row, zone);
    } catch {
      throw new ApiError(400, [`Can not ${ id ? 'Update' : 'Create' } TimeLog`]);
    }
  }

  public async list(
    taskId: string,
  ): Promise<TimerResponse[]> {
    const rows: TimerRow[] = await this.repository.forTask(taskId);

    if (!rows.length) {
      throw new ApiError(404, ['TimeLogs not found']);
    }

    const zone: string = await this.timezone.userTimezone();

    return rows.map(
      (
        row,
      ) => this.mapper.timer(row, zone,
      ));
  }

  public async show(
    taskId: string,
    id: string,
  ): Promise<TimerResponse> {
    return this.mapper.timer(await this.get(taskId, id, 'TimeLogs not found'), await this.timezone.userTimezone());
  }

  public async delete(
    taskId: string,
    id: string,
  ): Promise<void> {
    await this.get(taskId, id);

    try {
      await this.repository.delete(taskId, id);
    } catch {
      throw new ApiError(400, ['Can not Delete TimeLog']);
    }
  }

  public async changeRunning(
    taskId: string,
    action: string,
  ): Promise<boolean> {
    await this.tasks.get(taskId);

    try {
      if (action === 'start') {
        // Deliberately separate commits: a failed insert must leave previous timers stopped.
        await this.repository.stopAll();
        await this.repository.start(taskId, randomUUID());
      } else {
        const id: string | undefined = await this.repository.latestRunning(taskId);

        if (!id) {
          return false;
        }

        await this.repository.stop(id);
      }

      return true;
    } catch {
      return false;
    }
  }

  public async active(): Promise<TaskResponse> {
    const id: string | undefined = await this.repository.activeTask();

    if (!id) {
      throw new ApiError(404, ['Task not found']);
    }

    return this.tasks.show(id);
  }

  public async today(): Promise<TodayTotalResponse> {
    const now: DateTime = DateTime.now().setZone(await this.timezone.userTimezone());
    const start: DateTime = now.startOf('day');
    const end: DateTime = start.plus({
      days: 1
    });
    const rows: Pick<TimerRow, 'start_time' | 'end_time'>[] = await this.repository.overlapping(start.toISO(), end.toISO());
    const totalSeconds: number = rows.reduce((
      total,
      row,
    ) => total + Math.max(0, Math.floor(Math.min(+(row.end_time ? this.dates.storedDate(row.end_time) : now), +end) / 1000) - Math.floor(Math.max(+this.dates.storedDate(row.start_time), +start) / 1000)), 0);

    return {
      totalSeconds
    };
  }
}
