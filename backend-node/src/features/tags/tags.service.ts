import { randomUUID } from 'node:crypto';
import { errorCode } from '../../database/database.helpers.js';
import type { TagRow } from '../../database/records.types.js';
import { ApiError } from '../../http/api-error.js';
import type { ResponseMapper } from '../../shared/response-mapper.js';
import type { TagResponse } from '../../shared/responses.types.js';
import { lengths, stringFields } from '../../shared/validation.js';
import type { TimezoneProvider } from '../../time/time.types.js';
import type { TagsStore } from './tags.types.js';

export class TagsService {
  constructor(private readonly repository: TagsStore, private readonly timezone: TimezoneProvider, private readonly mapper: ResponseMapper) { }
  private async get(id: string): Promise<TagRow> {
    const row = await this.repository.find(id);
    if (!row) throw new ApiError(404, ['Tag not found']);
    return row;
  }
  async save(input: Record<string, unknown>, id?: string): Promise<TagResponse> {
    stringFields(input, ['name']);
    lengths(input, { name: [3, 255] });
    const old = id ? await this.get(id) : undefined;
    if (typeof input.name !== 'string') throw new Error('Missing name');
    try {
      if (old && old.name === input.name) return this.mapper.tag(old, await this.timezone.userTimezone());
      const row = await this.repository.save(id ?? randomUUID(), input.name, Boolean(id));
      return this.mapper.tag({ ...row, is_used: old?.is_used ?? false }, await this.timezone.userTimezone());
    } catch (error) {
      throw new ApiError(400, [!id && errorCode(error) === '23505' ? 'Duplicate Tag name' : `Can not ${id ? 'Update' : 'Create'} Tag`]);
    }
  }
  async list(): Promise<TagResponse[]> {
    const rows = await this.repository.list();
    if (!rows.length) throw new ApiError(404, ['Tags not found']);
    const zone = await this.timezone.userTimezone();
    return rows.map(row => this.mapper.tag(row, zone));
  }
  async show(id: string): Promise<TagResponse> { return this.mapper.tag(await this.get(id), await this.timezone.userTimezone()); }
  async delete(id: string): Promise<void> {
    const tag = await this.get(id);
    if (tag.is_used) throw new ApiError(409, ['Tag is used by existing tasks']);
    try { await this.repository.delete(id); }
    catch { throw new ApiError(400, ['Can not Delete Tag']); }
  }
}
