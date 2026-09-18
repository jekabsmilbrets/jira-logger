import { randomUUID } from 'node:crypto';
import { db, transaction } from './db.js';
import { taskView } from './projections.js';
import { ApiError, body, envelope, lengths, queryParams, stringFields, uuid, type Route } from './http.js';
import { listTasks } from './reports.js';

export async function getTask(id: string) {
  const row = (await db.query('SELECT * FROM task WHERE id=$1', [id])).rows[0];
  if (!row) throw new ApiError(404, ['Task not found']);
  return row;
}
async function save(input: Record<string, unknown>, id?: string) {
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
  const old = id ? await getTask(id) : undefined;
  // PHP resolves associations outside the write exception handler.
  const tags = 'tags' in input ? (await db.query('SELECT id FROM tag WHERE id=ANY($1::uuid[])', [input.tags])).rows : undefined;
  const taskId = id ?? randomUUID();
  try {
    await transaction(async client => {
      const description = input.description ?? old?.description ?? null;
      if (!old) await client.query("INSERT INTO task (id,name,description,created_at,updated_at) VALUES ($1,$2,$3,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP))", [taskId, input.name, description]);
      else if (old.name !== input.name || old.description !== description) await client.query("UPDATE task SET name=$2,description=$3,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1", [taskId, input.name, description]);
      if (tags) {
        const tagIds = tags.map(tag => tag.id);
        await client.query('DELETE FROM tag_task WHERE task_id=$1 AND NOT(tag_id=ANY($2::uuid[]))', [taskId, tagIds]);
        for (const tag of tags) await client.query('INSERT INTO tag_task (tag_id,task_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [tag.id, taskId]);
      }
    });
  } catch (error) {
    throw new ApiError(400, [!id && (error as { code?: string }).code === '23505' ? 'Duplicate Task name' : `Can not ${id ? 'Update' : 'Create'} Task`]);
  }
  return envelope(await taskView(await getTask(taskId)));
}
export const taskRoutes: Route[] = [
  { path: /^\/api\/task$/, methods: {
    GET: async request => envelope(await listTasks(queryParams(request.url))),
    POST: async request => save(body(request)),
  } },
  { path: /^\/api\/task\/exist\/(.+)$/, methods: {
    GET: async (_request, reply, match) => reply.code((await db.query('SELECT 1 FROM task WHERE name=$1', [decodeURIComponent(match[1]).trim()])).rowCount ? 409 : 204).send([]),
  } },
  { path: new RegExp(`^/api/task/(${uuid})$`), methods: {
    GET: async (_request, _reply, match) => envelope(await taskView(await getTask(match[1]))),
    PATCH: async (request, _reply, match) => save(body(request), match[1]),
    DELETE: async (_request, reply, match) => {
      await getTask(match[1]);
      try {
        await transaction(async client => {
          for (const table of ['jira_work_log', 'time_log', 'tag_task']) await client.query(`DELETE FROM ${table} WHERE task_id=$1`, [match[1]]);
          await client.query('DELETE FROM task WHERE id=$1', [match[1]]);
        });
      } catch { throw new ApiError(400, ['Can not Delete Task']); }
      return reply.code(204).send();
    },
  } },
];
