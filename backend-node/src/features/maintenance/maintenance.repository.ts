import { randomUUID }       from 'node:crypto';

import pg from 'pg';

import { errorCode }           from '@database/database.helpers';
import type { DatabaseAccess } from '@database/database.types';

import type { AuditResult } from '@features/maintenance/maintenance.types';


export class MaintenanceRepository {
  constructor(
    private readonly database: DatabaseAccess,
    private readonly connectionString: string,
  ) {
  }

  public async seed(
    name: 'setting' | 'tag',
    entries: readonly (readonly [string, string | undefined])[],
    unload: boolean,
  ): Promise<void> {
    await this.database.transaction(async (
      client,
    ) => {
      if (unload) {
        await client.query(`DELETE
                            FROM ${ name }
                            WHERE name = ANY ($1)`, [entries.map((
          [key],
        ) => key)]);

        return;
      }

      for (const [key, value] of entries) {
        if ((await client.query(`SELECT 1
                                 FROM ${ name }
                                 WHERE name = $1`, [key])).rowCount) {
          continue;
        }

        const values: string[] = [randomUUID(), key];

        if (name === 'setting') {
          if (value === undefined) {
            throw new Error('Missing seed value');
          }

          values.push(value);
        }

        await client.query(`INSERT INTO ${ name } (id, name, ${ name === 'setting' ? 'value,' : '' } created_at, updated_at)
                            VALUES ($1, $2, ${ name === 'setting' ? '$3,' : '' }date_trunc('second', CURRENT_TIMESTAMP),
                                    date_trunc('second', CURRENT_TIMESTAMP))`, values);
      }
    });
  }

  public async createDatabase(): Promise<void> {
    const url: URL = new URL(this.connectionString);
    const name: string = decodeURIComponent(url.pathname.slice(1));
    url.pathname = '/postgres';
    const admin: pg.Client = new pg.Client({
      connectionString: url.toString()
    });

    try {
      await admin.connect();

      if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) {
        try {
          await admin.query(`CREATE DATABASE "${ name.replaceAll('"', '""') }"`);
        } catch (error) {
          if (errorCode(error) !== '42P04') {
            throw error;
          }
        }
      }
    } finally {
      await admin.end();
    }
  }

  public async audit(): Promise<AuditResult> {
    const duplicates: pg.QueryResult<AuditResult['duplicates'][number]> = await this.database.query<AuditResult['duplicates'][number]>('SELECT task_id,start_time,work_log_id,COUNT(*) AS duplicate_count FROM jira_work_log GROUP BY task_id,start_time,work_log_id HAVING COUNT(*)>1 ORDER BY duplicate_count DESC,task_id ASC');
    const invalid: pg.QueryResult<AuditResult['invalidTimeLogs'][number]> = await this.database.query<AuditResult['invalidTimeLogs'][number]>('SELECT id,task_id,start_time,end_time FROM time_log WHERE end_time IS NOT NULL AND end_time<=start_time ORDER BY task_id ASC,start_time ASC');

    return {
      duplicates: duplicates.rows,
      invalidTimeLogs: invalid.rows
    };
  }
}
