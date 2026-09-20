import { requiredRow }        from '@database/database.helpers';
import type { QueryExecutor } from '@database/database.types';
import type { TagRow }        from '@database/records.types';

import { select } from '@features/tags/tags.repository.constants';


export class TagsRepository {
  constructor(
    private readonly database: QueryExecutor,
  ) {
  }

  public async list(): Promise<TagRow[]> {
    return (await this.database.query<TagRow>(select)).rows;
  }

  public async find(
    id: string,
  ): Promise<TagRow | undefined> {
    return (await this.database.query<TagRow>(`${ select } WHERE t.id=$1`, [id])).rows[0];
  }

  public async resolve(
    ids: readonly (string | null)[],
  ): Promise<string[]> {
    return (await this.database.query<{
      id: string
    }>('SELECT id FROM tag WHERE id=ANY($1::uuid[])', [ids])).rows.map(
      (
        row,
      ) => row.id,
    );
  }

  public async save(
    id: string,
    name: string,
    update: boolean,
  ): Promise<TagRow> {
    const sql: string = update
      ? 'UPDATE tag SET name=$2,updated_at=date_trunc(\'second\',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING *'
      : 'INSERT INTO tag (id,name,created_at,updated_at) VALUES ($1,$2,date_trunc(\'second\',CURRENT_TIMESTAMP),date_trunc(\'second\',CURRENT_TIMESTAMP)) RETURNING *';

    return requiredRow((await this.database.query<TagRow>(sql, [id, name])).rows);
  }

  public async delete(
    id: string,
  ): Promise<void> {
    await this.database.query('DELETE FROM tag WHERE id=$1', [id]);
  }
}
