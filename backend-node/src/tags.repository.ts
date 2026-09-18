import type { QueryExecutor } from './db.js';
import { requiredRow } from './db.js';
import type { TagRow } from './models.js';

const select = 'SELECT t.*, EXISTS(SELECT 1 FROM tag_task j WHERE j.tag_id=t.id) AS is_used FROM tag t';
export class TagsRepository {
  constructor(private readonly database: QueryExecutor) {}
  async list(): Promise<TagRow[]> { return (await this.database.query<TagRow>(select)).rows; }
  async find(id: string): Promise<TagRow | undefined> { return (await this.database.query<TagRow>(`${select} WHERE t.id=$1`, [id])).rows[0]; }
  async forTask(id: string): Promise<TagRow[]> {
    return (await this.database.query<TagRow>('SELECT t.*,true AS is_used FROM tag t JOIN tag_task j ON j.tag_id=t.id WHERE j.task_id=$1', [id])).rows;
  }
  async resolve(ids: readonly (string | null)[]): Promise<string[]> {
    return (await this.database.query<{ id: string }>('SELECT id FROM tag WHERE id=ANY($1::uuid[])', [ids])).rows.map(row => row.id);
  }
  async save(id: string, name: string, update: boolean): Promise<TagRow> {
    const sql = update
      ? "UPDATE tag SET name=$2,updated_at=date_trunc('second',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING *"
      : "INSERT INTO tag (id,name,created_at,updated_at) VALUES ($1,$2,date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP)) RETURNING *";
    return requiredRow((await this.database.query<TagRow>(sql, [id, name])).rows);
  }
  async delete(id: string): Promise<void> { await this.database.query('DELETE FROM tag WHERE id=$1', [id]); }
}
export type TagsStore = Pick<TagsRepository, 'list' | 'find' | 'forTask' | 'resolve' | 'save' | 'delete'>;
