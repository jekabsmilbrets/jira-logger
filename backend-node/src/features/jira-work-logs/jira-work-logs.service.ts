import type { JiraWorkLogRow } from '@database/records.types';

import type { JiraWorkLogsStore } from '@features/jira-work-logs/jira-work-logs.types';
import type { TasksStore }        from '@features/tasks/tasks.types';

import { ApiError } from '@http/api-error';
import { uuid }     from '@http/http.constants';

import type { ResponseMapper }      from '@shared/response-mapper';
import type { JiraWorkLogResponse } from '@shared/responses.types';
import { lengths, stringFields }    from '@shared/validation';

import type { TimezoneProvider } from '@time/time.types';


export class JiraWorkLogsService {
  constructor(
    private readonly repository: JiraWorkLogsStore,
    private readonly tasks: Pick<TasksStore, 'find'>,
    private readonly timezone: TimezoneProvider,
    private readonly mapper: ResponseMapper,
  ) {
  }

  private async get(
    id: string,
  ): Promise<JiraWorkLogRow> {
    const row: JiraWorkLogRow | undefined = await this.repository.find(id);

    if (!row) {
      throw new ApiError(404, ['JiraWorkLog not found']);
    }

    return row;
  }

  public async save(
    input: Record<string, unknown>,
    id?: string,
  ): Promise<JiraWorkLogResponse> {
    if (input.description != null) {
      stringFields(input, ['description']);
    }

    if (input.timeSpentSeconds != null && !Number.isInteger(input.timeSpentSeconds)) {
      throw new ApiError(400, ['Bad Request']);
    }

    const task: string = input.task == null || typeof input.task === 'object' ? '' : input.task === true ? '1' : input.task === false ? '' : String(input.task);
    const errors: Record<string, string> = {};

    try {
      if (input.description != null) {
        lengths(input, {
          description: [0, 255]
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        Object.assign(errors, error.errors);
      } else {
        throw error;
      }
    }

    if (!task) {
      errors.task = 'This value should not be blank.';
    } else if (!new RegExp(`^${ uuid }$`, 'i').test(task)) {
      errors.task = 'This is not a valid UUID.';
    }

    if (input.timeSpentSeconds == null) {
      errors.timeSpentSeconds = 'This value should not be blank.';
    }

    if (Object.keys(errors).length) {
      throw new ApiError(406, errors);
    }

    const old: JiraWorkLogRow | undefined = id ? await this.get(id) : undefined;

    if (!(await this.tasks.find(task))) {
      throw new ApiError(404, ['JiraWorkLog not found']);
    }

    // PHP's DTO cannot populate the mandatory work_log_id/start_time columns.
    if (!id || !old) {
      throw new ApiError(400, ['Can not Create JiraWorkLog']);
    }

    try {
      if (typeof input.timeSpentSeconds !== 'number') {
        throw new Error('Missing seconds');
      }

      const row: JiraWorkLogRow = await this.repository.update(id, task, typeof input.description === 'string' ? input.description : old.description, input.timeSpentSeconds);

      return this.mapper.jira(row, await this.timezone.userTimezone());
    } catch {
      throw new ApiError(400, ['Can not Update JiraWorkLog']);
    }
  }

  public async list(): Promise<JiraWorkLogResponse[]> {
    const rows: JiraWorkLogRow[] = await this.repository.list();

    if (!rows.length) {
      throw new ApiError(404, ['JiraWorkLogs not found']);
    }

    const zone: string = await this.timezone.userTimezone();

    return rows.map(
      (
        row,
      ) => this.mapper.jira(row, zone,
      ));
  }

  public async show(
    id: string,
  ): Promise<JiraWorkLogResponse> {
    return this.mapper.jira(await this.get(id), await this.timezone.userTimezone());
  }

  public async delete(
    id: string,
  ): Promise<void> {
    await this.get(id);

    try {
      await this.repository.delete(id);
    } catch {
      throw new ApiError(400, ['Can not Delete JiraWorkLog']);
    }
  }
}
