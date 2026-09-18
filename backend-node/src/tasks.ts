import { randomUUID } from 'node:crypto';
import { db, errorCode } from './db.js';
import type { TasksStore } from './tasks.repository.js';
import type { TagsStore } from './tags.repository.js';
import type { TimezoneProvider } from './dates.js';
import type { TaskRow } from './models.js';
import { ResponseMapper, type TaskResponse } from './projections.js';
import type { ReportService } from './reports.js';
import { ApiError, body, capture, envelope, lengths, queryParams, stringFields, uuid, type Route } from './http.js';

// Transitional lookup for timer/Jira callers until they receive TasksService.
export async function getTask(id: string): Promise<TaskRow> {
  const row = (await db.query<TaskRow>('SELECT * FROM task WHERE id=$1', [id])).rows[0];
  if (!row) throw new ApiError(404, ['Task not found']);
  return row;
}
export class TasksService {
  constructor(private readonly repository: TasksStore, private readonly tags: TagsStore, private readonly timezone: TimezoneProvider, private readonly mapper: ResponseMapper) {}
  async get(id: string): Promise<TaskRow> {
    const row = await this.repository.find(id);
    if (!row) throw new ApiError(404, ['Task not found']);
    return row;
  }
  async show(id: string, zone?: string): Promise<TaskResponse> { return this.project(await this.get(id), zone); }
  async project(row: TaskRow, zone?: string): Promise<TaskResponse> {
    zone ??= await this.timezone.userTimezone();
    return this.mapper.task(row, await this.repository.relations(row.id), zone);
  }
  async exists(name: string): Promise<boolean> { return this.repository.exists(name); }
async save(input: Record<string, unknown>, id?: string): Promise<TaskResponse> {
  stringFields(input, ['name']);
  if (input.description != null) stringFields(input, ['description']);
  if ('tags' in input && !Array.isArray(input.tags)) throw new ApiError(400, ['Bad Request']);
  const errors: Record<string, string> = {};
  if (!input.name) errors.name = 'This value should not be blank.';
  try { lengths(input, { name: [3, 255], ...(input.description != null ? { description: [0, 255] as [number, number] } : {}) }); }
  catch (error) { if (error instanceof ApiError) Object.assign(errors, error.errors); else throw error; }
  if (Array.isArray(input.tags)) input.tags.forEach((tag, index) => {
    if (tag !== null && typeof tag !== 'string') errors[`tags[${index}]`] = 'This value should be of type string.';
  });
  if (Object.keys(errors).length) throw new ApiError(406, errors);
  const old = id ? await this.get(id) : undefined;
  // PHP resolves associations outside the write exception handler.
  const tagInput = Array.isArray(input.tags) ? input.tags.filter((tag): tag is string | null => tag === null || typeof tag === 'string') : undefined;
  const tags = tagInput ? await this.tags.resolve(tagInput) : undefined;
  const taskId = id ?? randomUUID();
  try {
    if (typeof input.name !== 'string') throw new Error('Missing name');
    await this.repository.save({ id: taskId, name: input.name, description: typeof input.description === 'string' ? input.description : old?.description ?? null }, old, tags);
  } catch (error) {
    throw new ApiError(400, [!id && errorCode(error) === '23505' ? 'Duplicate Task name' : `Can not ${id ? 'Update' : 'Create'} Task`]);
  }
  return this.show(taskId);
}
  async delete(id: string): Promise<void> {
    await this.get(id);
    try { await this.repository.delete(id); }
    catch { throw new ApiError(400, ['Can not Delete Task']); }
  }
}
export class TasksController {
  constructor(private readonly service: TasksService, private readonly reports: ReportService) {}
  routes(): Route[] {
    return [
      { path: /^\/api\/task$/, methods: {
        GET: async request => envelope(await this.reports.list(queryParams(request.url))),
        POST: async request => envelope(await this.service.save(body(request))),
      } },
      { path: /^\/api\/task\/exist\/(.+)$/, methods: {
        GET: async (_request, reply, match) => reply.code(await this.service.exists(decodeURIComponent(capture(match, 1)).trim()) ? 409 : 204).send([]),
      } },
      { path: new RegExp(`^/api/task/(${uuid})$`), methods: {
        GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1))),
        PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
        DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1)); return reply.code(204).send(); },
      } },
    ];
  }
}
