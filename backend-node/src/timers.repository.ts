import type { QueryExecutor } from './database/database.types.js';
import type { TimerRow, TimerWrite } from './database/records.types.js';
import { requiredRow } from './db.js';

export class TimersRepository {
  constructor(private readonly database: QueryExecutor) { }
  async find(taskId: string, id: string): Promise<TimerRow | undefined> {
    return (await this.database.query<TimerRow>('SELECT * FROM time_log WHERE task_id=$1 AND id=$2', [taskId, id])).rows[0];
  }
  async forTask(id: string): Promise<TimerRow[]> {
    return (await this.database.query<TimerRow>('SELECT * FROM time_log WHERE task_id=$1', [id])).rows;
  }
  async save(input: TimerWrite, update: boolean): Promise<TimerRow> {
    const sql = update
      ? "UPDATE time_log SET start_time=$3,end_time=$4,description=$5,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1 AND task_id=$2 RETURNING *"
      : "INSERT INTO time_log (id,task_id,start_time,end_time,description,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP)) RETURNING *";
    return requiredRow((await this.database.query<TimerRow>(sql, [input.id, input.taskId, input.start, input.end, input.description])).rows);
  }
  async delete(taskId: string, id: string): Promise<void> { await this.database.query('DELETE FROM time_log WHERE id=$1 AND task_id=$2', [id, taskId]); }
  async stopAll(): Promise<void> { await this.database.query('UPDATE time_log SET end_time=NOW() WHERE end_time IS NULL'); }
  async start(taskId: string, id: string): Promise<void> {
    await this.database.query("INSERT INTO time_log (id,task_id,start_time,created_at,updated_at) VALUES ($1,$2,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP))", [id, taskId]);
  }
  async latestRunning(taskId: string): Promise<string | undefined> {
    return (await this.database.query<{ id: string }>('SELECT id FROM time_log WHERE task_id=$1 AND end_time IS NULL ORDER BY start_time DESC,created_at DESC LIMIT 1', [taskId])).rows[0]?.id;
  }
  async stop(id: string): Promise<void> {
    await this.database.query("UPDATE time_log SET end_time=date_trunc('second',CURRENT_TIMESTAMP),updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1", [id]);
  }
  async activeTask(): Promise<string | undefined> {
    return (await this.database.query<{ task_id: string }>('SELECT task_id FROM time_log WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1')).rows[0]?.task_id;
  }
  async overlapping(start: string | null, end: string | null): Promise<Pick<TimerRow, 'start_time' | 'end_time'>[]> {
    return (await this.database.query<Pick<TimerRow, 'start_time' | 'end_time'>>('SELECT start_time,end_time FROM time_log WHERE start_time<=$2 AND (end_time IS NULL OR end_time>=$1) ORDER BY start_time ASC', [start, end])).rows;
  }
}
