import { randomUUID }            from 'node:crypto';

import { errorCode }    from '@database/database.helpers';
import type { TaskRow } from '@database/records.types';

import type { TagsStore }  from '@features/tags/tags.types';
import type { TasksStore } from '@features/tasks/tasks.types';

import { ApiError } from '@http/api-error';

import type { ResponseMapper }   from '@shared/response-mapper';
import type { TaskResponse }     from '@shared/responses.types';
import { lengths, stringFields } from '@shared/validation';

import type { TimezoneProvider } from '@time/time.types';


export class TasksService {
  constructor(
    private readonly repository: TasksStore,
    private readonly tags: TagsStore,
    private readonly timezone: TimezoneProvider,
    private readonly mapper: ResponseMapper,
  ) {
  }

  public async get(
    id: string,
  ): Promise<TaskRow> {
    const row: TaskRow | undefined = await this.repository.find(id);

    if (!row) {
      throw new ApiError(404, ['Task not found']);
    }

    return row;
  }

  public async show(
    id: string,
    zone?: string,
  ): Promise<TaskResponse> {
    return this.project(await this.get(id), zone);
  }

  public async project(
    row: TaskRow,
    zone?: string,
  ): Promise<TaskResponse> {
    zone ??= await this.timezone.userTimezone();

    return this.mapper.task(row, await this.repository.relations(row.id), zone);
  }

  public async exists(
    name: string,
  ): Promise<boolean> {
    return this.repository.exists(name);
  }

  public async save(
    input: Record<string, unknown>,
    id?: string,
  ): Promise<TaskResponse> {
    stringFields(input, ['name']);

    if (input.description != null) {
      stringFields(input, ['description']);
    }

    if ('tags' in input && !Array.isArray(input.tags)) {
      throw new ApiError(400, ['Bad Request']);
    }

    const errors: Record<string, string> = {};

    if (!input.name) {
      errors.name = 'This value should not be blank.';
    }

    try {
      lengths(input, {
        name: [3, 255],
        ...(input.description != null ? {
          description: [0, 255] as [number, number]
        } : {})
      });
    } catch (error) {
      if (error instanceof ApiError) {
        Object.assign(errors, error.errors);
      } else {
        throw error;
      }
    }

    if (Array.isArray(input.tags)) {
      input.tags.forEach((
        tag,
        index,
      ) => {
        if (tag !== null && typeof tag !== 'string') {
          errors[`tags[${ index }]`] = 'This value should be of type string.';
        }
      });
    }

    if (Object.keys(errors).length) {
      throw new ApiError(406, errors);
    }

    const old: TaskRow | undefined = id ? await this.get(id) : undefined;
    // PHP resolves associations outside the write exception handler.
    const tagInput: (string | null)[] | undefined = Array.isArray(input.tags) ? input.tags.filter((
      tag,
    ): tag is string | null => tag === null || typeof tag === 'string') : undefined;
    const tags: string[] | undefined = tagInput ? await this.tags.resolve(tagInput) : undefined;
    const taskId: string = id ?? randomUUID();

    try {
      if (typeof input.name !== 'string') {
        throw new Error('Missing name');
      }

      await this.repository.save({
        id: taskId,
        name: input.name,
        description: typeof input.description === 'string' ? input.description : old?.description ?? null
      }, old, tags);
    } catch (error) {
      throw new ApiError(400, [!id && errorCode(error) === '23505' ? 'Duplicate Task name' : `Can not ${ id ? 'Update' : 'Create' } Task`]);
    }

    return this.show(taskId);
  }

  public async delete(
    id: string,
  ): Promise<void> {
    await this.get(id);

    try {
      await this.repository.delete(id);
    } catch {
      throw new ApiError(400, ['Can not Delete Task']);
    }
  }
}
