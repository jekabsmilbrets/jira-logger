import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import type { TimerRow } from './database/records.types.js';
import type { DateCodec } from './dates.js';
import { parseDate, sqlDate } from './dates.js';
import type { TimersStore } from './features/timers/timers.types.js';
import { ApiError, body, capture, envelope, stringFields } from './http.js';
import { uuid } from './http/http.constants.js';
import type { Route } from './http/http.types.js';
import type { ResponseMapper } from './projections.js';
import type { TaskResponse, TimerResponse, TodayTotalResponse } from './shared/responses.types.js';
import type { TasksService } from './tasks.js';
import type { TimezoneProvider } from './time/time.types.js';

function scalar(value: unknown): string { return value === true ? '1' : value === false || value === null || typeof value === 'object' ? '' : String(value); }

export class TimersService {
  constructor(private readonly repository: TimersStore, private readonly tasks: Pick<TasksService, 'get' | 'show'>, private readonly timezone: TimezoneProvider, private readonly dates: DateCodec, private readonly mapper: ResponseMapper) { }
  private async get(taskId: string, id: string, message = 'TimeLog not found'): Promise<TimerRow> {
    const row = await this.repository.find(taskId, id);
    if (!row) throw new ApiError(404, [message]);
    return row;
  }
  async save(input: Record<string, unknown>, taskId: string, id?: string): Promise<TimerResponse> {
    if (input.description != null) stringFields(input, ['description']);
    const zone = await this.timezone.userTimezone();
    const errors: Record<string, string> = {};
    let start: DateTime | null = null;
    let end: DateTime | null = null;
    const startInput = 'startTime' in input ? scalar(input.startTime) : '';
    if (!startInput) errors.startTime = 'This value should not be blank.';
    try { start = parseDate(startInput, zone); } catch { errors.startTime = 'This value is not a valid date-time format.'; }
    try { end = parseDate('endTime' in input ? scalar(input.endTime) : null, zone); } catch { errors.endTime = 'This value is not a valid date-time format.'; }
    if (typeof input.description === 'string' && [...input.description].length > 255) errors.description = 'This value is too long. It should have 255 characters or less.';
    if (!new RegExp(`^${uuid}$`, 'i').test(taskId)) errors.task = 'This is not a valid UUID.';
    if (Object.keys(errors).length) throw new ApiError(406, errors);
    const old = id ? await this.get(taskId, id) : undefined;
    await this.tasks.get(taskId);
    try {
      const row = await this.repository.save({
        id: id ?? randomUUID(), taskId,
        start: start ? sqlDate(start) : old?.start_time ?? null, end: end ? sqlDate(end) : old?.end_time ?? null,
        description: typeof input.description === 'string' ? input.description : old?.description ?? null
      }, Boolean(id));
      return this.mapper.timer(row, zone);
    } catch { throw new ApiError(400, [`Can not ${id ? 'Update' : 'Create'} TimeLog`]); }
  }
  async list(taskId: string): Promise<TimerResponse[]> {
    const rows = await this.repository.forTask(taskId);
    if (!rows.length) throw new ApiError(404, ['TimeLogs not found']);
    const zone = await this.timezone.userTimezone();
    return rows.map(row => this.mapper.timer(row, zone));
  }
  async show(taskId: string, id: string): Promise<TimerResponse> {
    return this.mapper.timer(await this.get(taskId, id, 'TimeLogs not found'), await this.timezone.userTimezone());
  }
  async delete(taskId: string, id: string): Promise<void> {
    await this.get(taskId, id);
    try { await this.repository.delete(taskId, id); }
    catch { throw new ApiError(400, ['Can not Delete TimeLog']); }
  }
  async changeRunning(taskId: string, action: string): Promise<boolean> {
    await this.tasks.get(taskId);
    try {
      if (action === 'start') {
        // Deliberately separate commits: a failed insert must leave previous timers stopped.
        await this.repository.stopAll();
        await this.repository.start(taskId, randomUUID());
      } else {
        const id = await this.repository.latestRunning(taskId);
        if (!id) return false;
        await this.repository.stop(id);
      }
      return true;
    } catch { return false; }
  }
  async active(): Promise<TaskResponse> {
    const id = await this.repository.activeTask();
    if (!id) throw new ApiError(404, ['Task not found']);
    return this.tasks.show(id);
  }
  async today(): Promise<TodayTotalResponse> {
    const now = DateTime.now().setZone(await this.timezone.userTimezone());
    const start = now.startOf('day');
    const end = start.plus({ days: 1 });
    const rows = await this.repository.overlapping(start.toISO(), end.toISO());
    const totalSeconds = rows.reduce((total, row) => total + Math.max(0, Math.floor(Math.min(+(row.end_time ? this.dates.storedDate(row.end_time) : now), +end) / 1000) - Math.floor(Math.max(+this.dates.storedDate(row.start_time), +start) / 1000)), 0);
    return { totalSeconds };
  }
}

export class TimersController {
  constructor(private readonly service: TimersService) { }
  routes(): Route[] {
    return [
      {
        path: new RegExp(`^/api/task/(${uuid})/time-log$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.list(capture(match, 1))),
          POST: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
        }
      },
      { path: /^\/api\/task\/([^/]+)\/time-log$/, methods: { POST: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))) } },
      {
        path: new RegExp(`^/api/task/([^/]+)/time-log/(${uuid})$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1), capture(match, 2))),
          PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1), capture(match, 2))),
          DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1), capture(match, 2)); return reply.code(204).send(); },
        }
      },
      {
        path: /^\/api\/task\/([^/]+)\/time-log\/(start|stop)$/, methods: {
          POST: async (_request, reply, match) => await this.service.changeRunning(capture(match, 1), capture(match, 2)) ? reply.code(204).send() : reply.code(409).send([]),
        }
      },
      { path: /^\/api\/task\/active$/, methods: { GET: async () => envelope(await this.service.active()) } },
      { path: /^\/api\/task\/today\/seconds$/, methods: { GET: async () => envelope(await this.service.today()) } },
    ];
  }
}
