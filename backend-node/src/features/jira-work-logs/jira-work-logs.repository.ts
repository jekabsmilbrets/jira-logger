import { requiredRow }         from '@database/database.helpers';
import type { QueryExecutor }  from '@database/database.types';
import type { JiraWorkLogRow } from '@database/records.types';

import type { RemoteWorkLogWrite } from '@features/jira-work-logs/jira-work-logs.types';


export class JiraWorkLogsRepository {
  constructor(
    private readonly database: QueryExecutor,
  ) {
  }

  public async list(): Promise<JiraWorkLogRow[]> {
    return (await this.database.query<JiraWorkLogRow>('SELECT * FROM jira_work_log')).rows;
  }

  public async find(
    id: string,
  ): Promise<JiraWorkLogRow | undefined> {
    return (await this.database.query<JiraWorkLogRow>('SELECT * FROM jira_work_log WHERE id=$1', [id])).rows[0];
  }

  public async forDate(
    taskId: string,
    date: string | null,
  ): Promise<JiraWorkLogRow | undefined> {
    return (await this.database.query<JiraWorkLogRow>('SELECT * FROM jira_work_log WHERE task_id=$1 AND start_time=$2 LIMIT 1', [taskId, date])).rows[0];
  }

  public async update(
    id: string,
    taskId: string,
    description: string | null,
    seconds: number,
  ): Promise<JiraWorkLogRow> {
    return requiredRow((await this.database.query<JiraWorkLogRow>('UPDATE jira_work_log SET task_id=$2,description=$3,time_spent_seconds=$4,updated_at=date_trunc(\'second\',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING *', [id, taskId, description, seconds])).rows);
  }

  public async saveRemote(
    input: RemoteWorkLogWrite,
    update: boolean,
  ): Promise<void> {
    if (update) {
      await this.database.query('UPDATE jira_work_log SET work_log_id=$2,time_spent_seconds=$3,start_time=$4,updated_at=date_trunc(\'second\',CURRENT_TIMESTAMP) WHERE id=$1', [input.id, input.remoteId, input.seconds, input.date]);
    } else {
      await this.database.query('INSERT INTO jira_work_log (id,task_id,work_log_id,time_spent_seconds,start_time,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,date_trunc(\'second\',CURRENT_TIMESTAMP),date_trunc(\'second\',CURRENT_TIMESTAMP))', [input.id, input.taskId, input.remoteId, input.seconds, input.date]);
    }
  }

  public async delete(
    id: string,
  ): Promise<void> {
    await this.database.query('DELETE FROM jira_work_log WHERE id=$1', [id]);
  }
}
