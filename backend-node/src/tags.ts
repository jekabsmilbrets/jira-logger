import { randomUUID } from 'node:crypto';
import { errorCode } from './db.js';
import type { TagsStore } from './tags.repository.js';
import type { TagRow } from './models.js';
import type { TimezoneProvider } from './dates.js';
import { tagView } from './projections.js';
import { ApiError, body, capture, envelope, lengths, stringFields, uuid, type Route } from './http.js';

export class TagsService {
  constructor(private readonly repository: TagsStore, private readonly timezone: TimezoneProvider) {}
  async get(id: string): Promise<TagRow> {
  const row = await this.repository.find(id);
  if (!row) throw new ApiError(404, ['Tag not found']);
  return row;
}
async save(input: Record<string, unknown>, id?: string): Promise<ReturnType<typeof tagView>> {
  stringFields(input, ['name']);
  lengths(input, { name: [3, 255] });
  const old = id ? await this.get(id) : undefined;
  if (typeof input.name !== 'string') throw new Error('Missing name');
  try {
    if (old && old.name === input.name) return tagView(old, await this.timezone.userTimezone());
    const row = await this.repository.save(id ?? randomUUID(), input.name, Boolean(id));
    return tagView({ ...row, is_used: old?.is_used ?? false }, await this.timezone.userTimezone());
  } catch (error) {
    throw new ApiError(400, [!id && errorCode(error) === '23505' ? 'Duplicate Tag name' : `Can not ${id ? 'Update' : 'Create'} Tag`]);
  }
}
  async list(): Promise<ReturnType<typeof tagView>[]> {
    const rows = await this.repository.list();
    if (!rows.length) throw new ApiError(404, ['Tags not found']);
    const zone = await this.timezone.userTimezone();
    return rows.map(row => tagView(row, zone));
  }
  async show(id: string): Promise<ReturnType<typeof tagView>> { return tagView(await this.get(id), await this.timezone.userTimezone()); }
  async delete(id: string): Promise<void> {
    const tag = await this.get(id);
    if (tag.is_used) throw new ApiError(409, ['Tag is used by existing tasks']);
    try { await this.repository.delete(id); }
    catch { throw new ApiError(400, ['Can not Delete Tag']); }
  }
}
export class TagsController {
  constructor(private readonly service: TagsService) {}
  routes(): Route[] {
    return [
      { path: /^\/api\/tag$/, methods: {
        GET: async () => envelope(await this.service.list()),
        POST: async request => envelope(await this.service.save(body(request))),
      } },
      { path: new RegExp(`^/api/tag/(${uuid})$`), methods: {
        GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1))),
        PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
        DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1)); return reply.code(204).send(); },
      } },
    ];
  }
}
