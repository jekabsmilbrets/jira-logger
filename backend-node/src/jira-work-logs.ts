import { db } from './db.js';
import { userTimezone } from './dates.js';
import { jiraView } from './projections.js';
import { ApiError, body, envelope, lengths, stringFields, uuid, type Route } from './http.js';

async function get(id: string) {
  const row = (await db.query('SELECT * FROM jira_work_log WHERE id=$1', [id])).rows[0];
  if (!row) throw new ApiError(404, ['JiraWorkLog not found']);
  return row;
}
async function save(input: Record<string, unknown>, id?: string) {
  if (input.description != null) stringFields(input, ['description']);
  if (input.timeSpentSeconds != null && !Number.isInteger(input.timeSpentSeconds)) throw new ApiError(400, ['Bad Request']);
  if (input.description != null) lengths(input, { description: [0, 255] });
  const task = input.task == null || typeof input.task === 'object' ? '' : input.task === true ? '1' : input.task === false ? '' : String(input.task);
  const errors: Record<string, string> = {};
  if (!task) errors.task = 'This value should not be blank.';
  else if (!new RegExp(`^${uuid}$`, 'i').test(task)) errors.task = 'This is not a valid UUID.';
  if (input.timeSpentSeconds == null) errors.timeSpentSeconds = 'This value should not be blank.';
  if (Object.keys(errors).length) throw new ApiError(406, errors);
  const old = id ? await get(id) : undefined;
  if (!(await db.query('SELECT 1 FROM task WHERE id=$1', [task])).rowCount) throw new ApiError(404, ['JiraWorkLog not found']);
  // PHP's DTO cannot populate the mandatory work_log_id/start_time columns.
  if (!id) throw new ApiError(400, ['Can not Create JiraWorkLog']);
  try {
    const row = (await db.query("UPDATE jira_work_log SET task_id=$2,description=$3,time_spent_seconds=$4,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING *", [id, task, input.description ?? old.description, input.timeSpentSeconds])).rows[0];
    return envelope(jiraView(row, await userTimezone()));
  } catch { throw new ApiError(400, ['Can not Update JiraWorkLog']); }
}
export const jiraWorkLogRoutes: Route[] = [
  { path: /^\/api\/jira-work-log$/, methods: {
    GET: async () => {
      const rows = (await db.query('SELECT * FROM jira_work_log')).rows;
      if (!rows.length) throw new ApiError(404, ['JiraWorkLogs not found']);
      const zone = await userTimezone();
      return envelope(rows.map(row => jiraView(row, zone)));
    },
    POST: async request => save(body(request)),
  } },
  { path: new RegExp(`^/api/jira-work-log/(${uuid})$`), methods: {
    GET: async (_request, _reply, match) => envelope(jiraView(await get(match[1]), await userTimezone())),
    PATCH: async (request, _reply, match) => save(body(request), match[1]),
    DELETE: async (_request, reply, match) => {
      await get(match[1]);
      try { await db.query('DELETE FROM jira_work_log WHERE id=$1', [match[1]]); }
      catch { throw new ApiError(400, ['Can not Delete JiraWorkLog']); }
      return reply.code(204).send();
    },
  } },
];
