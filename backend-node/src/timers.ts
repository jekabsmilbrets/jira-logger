import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { db } from './db.js';
import { parseDate, sqlDate, storedDate, userTimezone } from './dates.js';
import { timerView, taskView } from './projections.js';
import { getTask } from './tasks.js';
import { ApiError, body, envelope, stringFields, uuid, type Route } from './http.js';

function scalar(value: unknown): string { return value === true ? '1' : value === false || value === null || typeof value === 'object' ? '' : String(value); }
async function get(taskId: string, id: string, message = 'TimeLog not found') {
  const row = (await db.query('SELECT * FROM time_log WHERE task_id=$1 AND id=$2', [taskId, id])).rows[0];
  if (!row) throw new ApiError(404, [message]);
  return row;
}
async function save(input: Record<string, unknown>, taskId: string, id?: string) {
  if (input.description != null) stringFields(input, ['description']);
  const zone = await userTimezone();
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
  const old = id ? await get(taskId, id) : undefined;
  await getTask(taskId);
  try {
    const values = [id ?? randomUUID(), taskId, start ? sqlDate(start) : old?.start_time ?? null, end ? sqlDate(end) : old?.end_time ?? null, input.description ?? old?.description ?? null];
    const result = id
      ? await db.query("UPDATE time_log SET start_time=$3,end_time=$4,description=$5,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1 AND task_id=$2 RETURNING *", values)
      : await db.query("INSERT INTO time_log (id,task_id,start_time,end_time,description,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP)) RETURNING *", values);
    return envelope(timerView(result.rows[0], zone));
  } catch { throw new ApiError(400, [`Can not ${id ? 'Update' : 'Create'} TimeLog`]); }
}
export const timerRoutes: Route[] = [
  { path: new RegExp(`^/api/task/(${uuid})/time-log$`), methods: {
    GET: async (_request, _reply, match) => {
      const rows = (await db.query('SELECT * FROM time_log WHERE task_id=$1', [match[1]])).rows;
      if (!rows.length) throw new ApiError(404, ['TimeLogs not found']);
      const zone = await userTimezone();
      return envelope(rows.map(row => timerView(row, zone)));
    },
    POST: async (request, _reply, match) => save(body(request), match[1]),
  } },
  { path: /^\/api\/task\/([^/]+)\/time-log$/, methods: { POST: async (request, _reply, match) => save(body(request), match[1]) } },
  { path: new RegExp(`^/api/task/([^/]+)/time-log/(${uuid})$`), methods: {
    GET: async (_request, _reply, match) => envelope(timerView(await get(match[1], match[2], 'TimeLogs not found'), await userTimezone())),
    PATCH: async (request, _reply, match) => save(body(request), match[1], match[2]),
    DELETE: async (_request, reply, match) => {
      await get(match[1], match[2]);
      try { await db.query('DELETE FROM time_log WHERE id=$1 AND task_id=$2', [match[2], match[1]]); }
      catch { throw new ApiError(400, ['Can not Delete TimeLog']); }
      return reply.code(204).send();
    },
  } },
  { path: /^\/api\/task\/([^/]+)\/time-log\/(start|stop)$/, methods: {
    POST: async (_request, reply, match) => {
      await getTask(match[1]);
      try {
        if (match[2] === 'start') {
          // Separate committed statement: failed insertion must leave old timers stopped.
          await db.query('UPDATE time_log SET end_time=NOW() WHERE end_time IS NULL');
          await db.query("INSERT INTO time_log (id,task_id,start_time,created_at,updated_at) VALUES ($1,$2,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP))", [randomUUID(), match[1]]);
        } else {
          const row = (await db.query('SELECT id FROM time_log WHERE task_id=$1 AND end_time IS NULL ORDER BY start_time DESC,created_at DESC LIMIT 1', [match[1]])).rows[0];
          if (!row) return reply.code(409).send([]);
          await db.query("UPDATE time_log SET end_time=date_trunc('second',CURRENT_TIMESTAMP),updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1", [row.id]);
        }
      } catch { return reply.code(409).send([]); }
      return reply.code(204).send();
    },
  } },
  { path: /^\/api\/task\/active$/, methods: {
    GET: async () => {
      const row = (await db.query('SELECT task_id FROM time_log WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1')).rows[0];
      if (!row) throw new ApiError(404, ['Task not found']);
      return envelope(await taskView(await getTask(row.task_id)));
    },
  } },
  { path: /^\/api\/task\/today\/seconds$/, methods: {
    GET: async () => {
      const now = DateTime.now().setZone(await userTimezone());
      const start = now.startOf('day');
      const end = start.plus({ days: 1 });
      const rows = (await db.query('SELECT start_time,end_time FROM time_log WHERE start_time<=$2 AND (end_time IS NULL OR end_time>=$1) ORDER BY start_time ASC', [start.toISO(), end.toISO()])).rows;
      const totalSeconds = rows.reduce((total, row) => total + Math.max(0, Math.floor(Math.min(+(row.end_time ? storedDate(row.end_time) : now), +end) / 1000) - Math.floor(Math.max(+storedDate(row.start_time), +start) / 1000)), 0);
      return envelope({ totalSeconds });
    },
  } },
];
