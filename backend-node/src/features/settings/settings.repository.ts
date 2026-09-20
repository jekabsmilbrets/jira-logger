import { requiredRow }        from '@database/database.helpers';
import type { QueryExecutor } from '@database/database.types';
import type { SettingRow }    from '@database/records.types';


export class SettingsRepository {
  constructor(
    private readonly database: QueryExecutor,
  ) {
  }

  public async list(): Promise<SettingRow[]> {
    return (await this.database.query<SettingRow>('SELECT id,name,value FROM setting')).rows;
  }

  public async find(
    id: string,
  ): Promise<SettingRow | undefined> {
    return (await this.database.query<SettingRow>('SELECT id,name,value FROM setting WHERE id=$1', [id])).rows[0];
  }

  public async value(
    name: string,
  ): Promise<string | undefined> {
    return (await this.database.query<{
      value: string
    }>('SELECT value FROM setting WHERE name=$1', [name])).rows[0]?.value;
  }

  public async jiraConfiguration(): Promise<Record<string, string>> {
    const rows: Pick<SettingRow, 'value' | 'name'>[] = (await this.database.query<Pick<SettingRow, 'name' | 'value'>>('SELECT name,value FROM setting WHERE name IN (\'jira.enabled\',\'jira.host\',\'jira.personal-access-token\')')).rows;

    return Object.fromEntries(rows.map(
      (
        row,
      ) => [row.name, row.value],
    ));
  }

  public async save(
    row: SettingRow,
    update: boolean,
  ): Promise<SettingRow> {
    const sql: string = update
      ? 'UPDATE setting SET name=$2,value=$3,updated_at=date_trunc(\'second\',CURRENT_TIMESTAMP) WHERE id=$1 RETURNING id,name,value'
      : 'INSERT INTO setting (id,name,value,created_at,updated_at) VALUES ($1,$2,$3,date_trunc(\'second\',CURRENT_TIMESTAMP),date_trunc(\'second\',CURRENT_TIMESTAMP)) RETURNING id,name,value';

    return requiredRow((await this.database.query<SettingRow>(sql, [row.id, row.name, row.value])).rows);
  }

  public async delete(
    id: string,
  ): Promise<void> {
    await this.database.query('DELETE FROM setting WHERE id=$1', [id]);
  }
}
