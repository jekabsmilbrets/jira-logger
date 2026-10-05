import { requiredRow }               from '@database/database.helpers';
import type { DatabaseAccess }        from '@database/database.types';
import type { TimerRow, TimerWrite } from '@database/records.types';

import type { JiraTimerSummary } from '@features/timers/timers.types';


// SQLite integer division truncates toward zero; subtract the remainder correction
// to preserve Math.floor for timestamps before the Unix epoch.
const durationSeconds: string = `MAX(0,
  (end_ms / 1000 - (end_ms < 0 AND end_ms % 1000 <> 0)) -
  (start_ms / 1000 - (start_ms < 0 AND start_ms % 1000 <> 0)))`;


export class TimersRepository {
  constructor(
    private readonly database: DatabaseAccess,
  ) {
  }

  public async find(
    taskId: string,
    id: string,
  ): Promise<TimerRow | undefined> {
    return (await this.database.query<TimerRow>('SELECT * FROM time_log WHERE task_id=$1 AND id=$2', [taskId, id])).rows[0];
  }

  public async forTask(
    id: string,
  ): Promise<TimerRow[]> {
    return (await this.database.query<TimerRow>('SELECT * FROM time_log WHERE task_id=$1', [id])).rows;
  }

  public async save(
    input: TimerWrite,
    update: boolean,
  ): Promise<TimerRow> {
    const sql: string = update
      ? 'UPDATE time_log SET start_time=$3,end_time=$4,description=$5,updated_at=unixepoch()*1000 WHERE id=$1 AND task_id=$2 RETURNING *'
      : 'INSERT INTO time_log (id,task_id,start_time,end_time,description,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,unixepoch()*1000,unixepoch()*1000) RETURNING *';

    return requiredRow((await this.database.query<TimerRow>(sql, [input.id, input.taskId, input.start, input.end, input.description])).rows);
  }

  public async delete(
    taskId: string,
    id: string,
  ): Promise<void> {
    await this.database.query('DELETE FROM time_log WHERE id=$1 AND task_id=$2', [id, taskId]);
  }

  public changeRunning(
    taskId: string,
    id: string,
    action: string,
  ): boolean {
    return this.database.transaction(
      (
        client,
      ) => {
      if (action === 'start'
    ) {
        client.query('UPDATE time_log SET end_time=CAST(unixepoch(\'subsec\')*1000 AS INTEGER) WHERE end_time IS NULL');
        client.query('INSERT INTO time_log (id,task_id,start_time,created_at,updated_at) VALUES ($1,$2,unixepoch()*1000,unixepoch()*1000,unixepoch()*1000)', [id, taskId]);

        return true;
      }

      const timer: { id: string } | undefined = client.query<{ id: string }>('SELECT id FROM time_log WHERE task_id=$1 AND end_time IS NULL ORDER BY start_time DESC,created_at DESC LIMIT 1', [taskId]).rows[0];

      if (!timer) {
return false;
}

      client.query('UPDATE time_log SET end_time=unixepoch()*1000,updated_at=unixepoch()*1000 WHERE id=$1', [timer.id]);

      return true;
    });
  }

  public async activeTask(): Promise<string | undefined> {
    return (await this.database.query<{
      task_id: string
    }>('SELECT task_id FROM time_log WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1')).rows[0]?.task_id;
  }

  public async totalSeconds(
    startMs: number,
    endMs: number,
    nowMs: number,
  ): Promise<number> {
    return requiredRow(this.database.query<{ seconds: number }>(`
      WITH clipped AS (
        SELECT CAST(MAX(start_time, $1) AS INTEGER) AS start_ms,
               CAST(MIN(COALESCE(NULLIF(end_time, 0), $3), $2) AS INTEGER) AS end_ms
        FROM time_log
        WHERE start_time <= $2 AND (end_time IS NULL OR end_time >= $1)
      )
      SELECT COALESCE(SUM(${ durationSeconds }), 0) AS seconds FROM clipped
    `, [startMs, endMs, nowMs]).rows).seconds;
  }

  public async jiraSummary(
    taskId: string,
    startMs: number,
    endMs: number,
  ): Promise<JiraTimerSummary> {
    return requiredRow(this.database.query<JiraTimerSummary>(`
      WITH clipped AS (
        SELECT rowid AS source_rowid, description,
               CAST(MAX(start_time, $1) AS INTEGER) AS start_ms,
               CAST(MIN(COALESCE(NULLIF(end_time, 0), $2), $2) AS INTEGER) AS end_ms
        FROM time_log
        WHERE task_id = $3 AND start_time <= $2
          AND COALESCE(NULLIF(end_time, 0), $2) >= $1
      )
      SELECT COALESCE(SUM(${ durationSeconds }), 0) AS seconds,
             COALESCE(group_concat(description, ', ' ORDER BY source_rowid)
               FILTER (WHERE description IS NOT NULL AND description NOT IN ('', '0')), '') AS comment
      FROM clipped
    `, [startMs, endMs, taskId]).rows);
  }
}
