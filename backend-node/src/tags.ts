import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { userTimezone } from './dates.js';
import { tagView } from './projections.js';
import { ApiError, body, envelope, lengths, stringFields, uuid, type Route } from './http.js';

const select = 'SELECT t.*, EXISTS(SELECT 1 FROM tag_task j WHERE j.tag_id=t.id) AS is_used FROM tag t';
async function get(id: string) {
  const row = (await db.query(`${select} WHERE t.id=$1`, [id])).rows[0];
  if (!row) throw new ApiError(404, ['Tag not found']);
  return row;
}
async function save(input: Record<string, unknown>, id?: string) {
  stringFields(input, ['name']);
  lengths(input, { name: [3, 255] });
  const old = id ? await get(id) : undefined;
  if (!('name' in input)) throw new Error('Missing name');
  try {
    if (old && old.name === input.name) return envelope(tagView(old, await userTimezone()));
    const result = id
      ? await db.query("UPDATE tag SET name=$2,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING *", [id, input.name])
      : await db.query("INSERT INTO tag (id,name,created_at,updated_at) VALUES ($1,$2,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP)) RETURNING *", [randomUUID(), input.name]);
    return envelope(tagView({ ...result.rows[0], is_used: old?.is_used ?? false }, await userTimezone()));
  } catch (error) {
    throw new ApiError(400, [!id && (error as { code?: string }).code === '23505' ? 'Duplicate Tag name' : `Can not ${id ? 'Update' : 'Create'} Tag`]);
  }
}
export const tagRoutes: Route[] = [
  { path: /^\/api\/tag$/, methods: {
    GET: async () => {
      const rows = (await db.query(select)).rows;
      if (!rows.length) throw new ApiError(404, ['Tags not found']);
      const zone = await userTimezone();
      return envelope(rows.map(row => tagView(row, zone)));
    },
    POST: async request => save(body(request)),
  } },
  { path: new RegExp(`^/api/tag/(${uuid})$`), methods: {
    GET: async (_request, _reply, match) => envelope(tagView(await get(match[1]), await userTimezone())),
    PATCH: async (request, _reply, match) => save(body(request), match[1]),
    DELETE: async (_request, reply, match) => {
      const tag = await get(match[1]);
      if (tag.is_used) throw new ApiError(409, ['Tag is used by existing tasks']);
      try { await db.query('DELETE FROM tag WHERE id=$1', [match[1]]); }
      catch { throw new ApiError(400, ['Can not Delete Tag']); }
      return reply.code(204).send();
    },
  } },
];
