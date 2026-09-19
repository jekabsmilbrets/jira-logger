import type { DatabaseAccess }                                       from '@database/database.types';
import type { JiraWorkLogRow, TagRow, TaskRow, TaskWrite, TimerRow } from '@database/records.types';

import type { TaskFilter, TaskRelations } from '@features/tasks/tasks.types';


export class TasksRepository {
  constructor(
    private readonly database: DatabaseAccess,
  ) {
  }

  public async find(
    id: string,
  ): Promise<TaskRow | undefined> {
    return (await this.database.query<TaskRow>('SELECT * FROM task WHERE id=$1', [id])).rows[0];
  }

  public async exists(
    name: string,
  ): Promise<boolean> {
    return Boolean((await this.database.query('SELECT 1 FROM task WHERE name=$1', [name])).rowCount);
  }

  public async names(): Promise<string[]> {
    return (await this.database.query<{ name: string }>('SELECT name FROM task')).rows.map(
      (
        row,
      ) => row.name,
    );
  }

  public async relations(
    id: string,
  ): Promise<TaskRelations> {
    const timers: TimerRow[] = (await this.database.query<TimerRow>('SELECT * FROM time_log WHERE task_id=$1', [id])).rows;
    const tags: TagRow[] = (await this.database.query<TagRow>('SELECT t.*,true AS is_used FROM tag t JOIN tag_task j ON j.tag_id=t.id WHERE j.task_id=$1', [id])).rows;
    const logs: JiraWorkLogRow[] = (await this.database.query<JiraWorkLogRow>('SELECT * FROM jira_work_log WHERE task_id=$1', [id])).rows;

    return {
      timers,
      tags,
      logs
    };
  }

  public async list(
    filter: TaskFilter,
  ): Promise<TaskRow[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    const bind: (
      value: unknown,
    ) => string = (
      value: unknown,
    ) => {
      values.push(value);

      return `$${ values.length }`;
    };

    const { tags, name, range } = filter;

    if (tags.length) {
      conditions.push(`EXISTS(SELECT 1 FROM tag_task j WHERE j.task_id=t.id AND j.tag_id=ANY(${ bind(tags) }::uuid[]))`);
    }

    if (name) {
      conditions.push(`lower(t.name) LIKE lower(${ bind(`%${ name }%`) })`);
    }

    if (range) {
      conditions.push(`EXISTS(SELECT 1 FROM time_log l WHERE l.task_id=t.id AND l.start_time<=${ bind(range[1]) } AND (l.end_time IS NULL OR l.end_time>=${ bind(range[0]) }))`);
    }

    return (await this.database.query<TaskRow>('SELECT t.* FROM task t' + (conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''), values)).rows;
  }

  public async save(
    input: TaskWrite,
    old: TaskRow | undefined,
    tags: string[] | undefined,
  ): Promise<void> {
    await this.database.transaction(async (
      client,
    ) => {
      if (!old) {
        await client.query('INSERT INTO task (id,name,description,created_at,updated_at) VALUES ($1,$2,$3,date_trunc(\'second\',CURRENT_TIMESTAMP),date_trunc(\'second\',CURRENT_TIMESTAMP))', [input.id, input.name, input.description]);
      } else if (old.name !== input.name || old.description !== input.description) {
        await client.query('UPDATE task SET name=$2,description=$3,updated_at=date_trunc(\'second\',CURRENT_TIMESTAMP) WHERE id=$1', [input.id, input.name, input.description]);
      }

      if (tags) {
        await client.query('DELETE FROM tag_task WHERE task_id=$1 AND NOT(tag_id=ANY($2::uuid[]))', [input.id, tags]);

        for (const tag of tags) {
          await client.query('INSERT INTO tag_task (tag_id,task_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [tag, input.id]);
        }
      }
    });
  }

  public async delete(
    id: string,
  ): Promise<void> {
    await this.database.transaction(async (
      client,
    ) => {
      for (const table of ['jira_work_log', 'time_log', 'tag_task']) {
        await client.query(`DELETE
                            FROM ${ table }
                            WHERE task_id = $1`, [id]);
      }

      await client.query('DELETE FROM task WHERE id=$1', [id]);
    });
  }
}
