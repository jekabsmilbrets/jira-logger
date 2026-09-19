import { randomUUID } from 'node:crypto';
import { errorCode } from '../../database/database.helpers.js';
import type { SettingRow } from '../../database/records.types.js';
import { ApiError } from '../../http/api-error.js';
import { lengths, stringFields } from '../../shared/validation.js';
import { redacted } from './settings.constants.js';
import type { SettingsStore } from './settings.types.js';

function disclose(row: SettingRow): SettingRow {
  return { id: row.id, name: row.name, value: /token|password|secret|key/i.test(row.name) ? redacted : row.value };
}

export class SettingsService {
  constructor(private readonly repository: SettingsStore) { }
  private async get(id: string): Promise<SettingRow> {
    const row = await this.repository.find(id);
    if (!row) throw new ApiError(404, ['Setting not found']);
    return row;
  }
  async save(input: Record<string, unknown>, id?: string): Promise<SettingRow> {
    stringFields(input, ['name', 'value']);
    lengths(input, { name: [3, 255], value: [3, 512] });
    const old = id ? await this.get(id) : undefined;
    // PHP reads value before name and lets missing typed fields escape to the framework.
    if (typeof input.value !== 'string') throw new Error('Missing value');
    if (input.value === redacted) throw new ApiError(400, ['Redacted setting values cannot be stored.']);
    if (typeof input.name !== 'string') throw new Error('Missing name');
    try {
      if (old && old.name === input.name && old.value === input.value) return disclose(old);
      return disclose(await this.repository.save({ id: id ?? randomUUID(), name: input.name, value: input.value }, Boolean(id)));
    } catch (error) {
      throw new ApiError(400, [!id && errorCode(error) === '23505' ? 'Duplicate Setting name' : `Can not ${id ? 'Update' : 'Create'} Setting`]);
    }
  }
  async list(): Promise<SettingRow[]> {
    const rows = await this.repository.list();
    if (!rows.length) throw new ApiError(404, ['Settings not found']);
    return rows.map(disclose);
  }
  async show(id: string): Promise<SettingRow> { return disclose(await this.get(id)); }
  async delete(id: string): Promise<void> {
    await this.get(id);
    try { await this.repository.delete(id); }
    catch { throw new ApiError(400, ['Can not Delete Setting']); }
  }
}
