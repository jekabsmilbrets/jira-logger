import type { JiraWorkLogsStore } from './jira-work-logs.repository.js';
import type { TasksStore } from './tasks.repository.js';
import type { JiraWorkLogRow } from './models.js';
import type { TimezoneProvider } from './dates.js';
import type { ResponseMapper, JiraWorkLogResponse } from './projections.js';
import { ApiError, body, capture, envelope, lengths, stringFields, uuid, type Route } from './http.js';

export class JiraWorkLogsService {
  constructor(private readonly repository: JiraWorkLogsStore, private readonly tasks: Pick<TasksStore, 'find'>, private readonly timezone: TimezoneProvider, private readonly mapper: ResponseMapper) { }
  private async get(id: string): Promise<JiraWorkLogRow> {
    const row = await this.repository.find(id);
    if (!row) throw new ApiError(404, ['JiraWorkLog not found']);
    return row;
  }
  async save(input: Record<string, unknown>, id?: string): Promise<JiraWorkLogResponse> {
    if (input.description != null) stringFields(input, ['description']);
    if (input.timeSpentSeconds != null && !Number.isInteger(input.timeSpentSeconds)) throw new ApiError(400, ['Bad Request']);
    const task = input.task == null || typeof input.task === 'object' ? '' : input.task === true ? '1' : input.task === false ? '' : String(input.task);
    const errors: Record<string, string> = {};
    try { if (input.description != null) lengths(input, { description: [0, 255] }); }
    catch (error) { if (error instanceof ApiError) Object.assign(errors, error.errors); else throw error; }
    if (!task) errors.task = 'This value should not be blank.';
    else if (!new RegExp(`^${uuid}$`, 'i').test(task)) errors.task = 'This is not a valid UUID.';
    if (input.timeSpentSeconds == null) errors.timeSpentSeconds = 'This value should not be blank.';
    if (Object.keys(errors).length) throw new ApiError(406, errors);
    const old = id ? await this.get(id) : undefined;
    if (!(await this.tasks.find(task))) throw new ApiError(404, ['JiraWorkLog not found']);
    // PHP's DTO cannot populate the mandatory work_log_id/start_time columns.
    if (!id || !old) throw new ApiError(400, ['Can not Create JiraWorkLog']);
    try {
      if (typeof input.timeSpentSeconds !== 'number') throw new Error('Missing seconds');
      const row = await this.repository.update(id, task, typeof input.description === 'string' ? input.description : old.description, input.timeSpentSeconds);
      return this.mapper.jira(row, await this.timezone.userTimezone());
    } catch { throw new ApiError(400, ['Can not Update JiraWorkLog']); }
  }
  async list(): Promise<JiraWorkLogResponse[]> {
    const rows = await this.repository.list();
    if (!rows.length) throw new ApiError(404, ['JiraWorkLogs not found']);
    const zone = await this.timezone.userTimezone();
    return rows.map(row => this.mapper.jira(row, zone));
  }
  async show(id: string): Promise<JiraWorkLogResponse> { return this.mapper.jira(await this.get(id), await this.timezone.userTimezone()); }
  async delete(id: string): Promise<void> {
    await this.get(id);
    try { await this.repository.delete(id); }
    catch { throw new ApiError(400, ['Can not Delete JiraWorkLog']); }
  }
}
export class JiraWorkLogsController {
  constructor(private readonly service: JiraWorkLogsService) { }
  routes(): Route[] {
    return [
      {
        path: /^\/api\/jira-work-log$/, methods: {
          GET: async () => envelope(await this.service.list()),
          POST: async request => envelope(await this.service.save(body(request))),
        }
      },
      {
        path: new RegExp(`^/api/jira-work-log/(${uuid})$`), methods: {
          GET: async (_request, _reply, match) => envelope(await this.service.show(capture(match, 1))),
          PATCH: async (request, _reply, match) => envelope(await this.service.save(body(request), capture(match, 1))),
          DELETE: async (_request, reply, match) => { await this.service.delete(capture(match, 1)); return reply.code(204).send(); },
        }
      },
    ];
  }
}
