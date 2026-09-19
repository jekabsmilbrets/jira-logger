import type { JiraWorkLogRow } from '../../database/records.types.js';
import { ApiError } from '../../http/api-error.js';
import { uuid } from '../../http/http.constants.js';
import type { ResponseMapper } from '../../shared/response-mapper.js';
import type { JiraWorkLogResponse } from '../../shared/responses.types.js';
import { lengths, stringFields } from '../../shared/validation.js';
import type { TimezoneProvider } from '../../time/time.types.js';
import type { TasksStore } from '../tasks/tasks.types.js';
import type { JiraWorkLogsStore } from './jira-work-logs.types.js';

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
