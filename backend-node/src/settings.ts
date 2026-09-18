import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { ApiError, body, envelope, lengths, stringFields, uuid, type Route } from './http.js';

const redacted = '***REDACTED***';
function disclose(row: { id: string; name: string; value: string }) {
  return { id: row.id, name: row.name, value: /token|password|secret|key/i.test(row.name) ? redacted : row.value };
}
async function get(id: string) {
  const row = (await db.query('SELECT id,name,value FROM setting WHERE id=$1', [id])).rows[0];
  if (!row) throw new ApiError(404, ['Setting not found']);
  return row;
}
async function save(input: Record<string, unknown>, id?: string) {
  stringFields(input, ['name', 'value']);
  lengths(input, { name: [3, 255], value: [3, 512] });
  const old = id ? await get(id) : undefined;
  // PHP reads value before name and lets missing typed fields escape to the framework.
  if (!('value' in input)) throw new Error('Missing value');
  if (input.value === redacted) throw new ApiError(400, ['Redacted setting values cannot be stored.']);
  if (!('name' in input)) throw new Error('Missing name');
  try {
    if (old && old.name === input.name && old.value === input.value) return envelope(disclose(old));
    const result = id
      ? await db.query("UPDATE setting SET name=$2,value=$3,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING id,name,value", [id, input.name, input.value])
      : await db.query("INSERT INTO setting (id,name,value,created_at,updated_at) VALUES ($1,$2,$3,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP)) RETURNING id,name,value", [randomUUID(), input.name, input.value]);
    return envelope(disclose(result.rows[0]));
  } catch (error) {
    throw new ApiError(400, [!id && (error as { code?: string }).code === '23505' ? 'Duplicate Setting name' : `Can not ${id ? 'Update' : 'Create'} Setting`]);
  }
}
export const settingsRoutes: Route[] = [
  { path: /^\/api\/setting$/, methods: {
    GET: async () => {
      const rows = (await db.query('SELECT id,name,value FROM setting')).rows;
      if (!rows.length) throw new ApiError(404, ['Settings not found']);
      return envelope(rows.map(disclose));
    },
    POST: async request => save(body(request)),
  } },
  { path: new RegExp(`^/api/setting/(${uuid})$`), methods: {
    GET: async (_request, _reply, match) => envelope(disclose(await get(match[1]))),
    PATCH: async (request, _reply, match) => save(body(request), match[1]),
    DELETE: async (_request, reply, match) => {
      await get(match[1]);
      try { await db.query('DELETE FROM setting WHERE id=$1', [match[1]]); }
      catch { throw new ApiError(400, ['Can not Delete Setting']); }
      return reply.code(204).send();
    },
  } },
];
