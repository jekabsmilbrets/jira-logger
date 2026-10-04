import { randomUUID } from 'node:crypto';

import type { DatabaseAccess } from '@database/database.types';

import type { AuditResult } from '@features/maintenance/maintenance.types';


export class MaintenanceRepository {
  constructor(
    private readonly database: DatabaseAccess,
  ) { }

  public async seed(
    name: 'setting' | 'tag',
    entries: readonly (readonly [string, string | undefined])[],
    unload: boolean,
  ): Promise<void> {
    this.database.transaction(
      (
        client,
      ) => {
        for (const [key, value] of entries
        ) {
          if (unload) {
            client.query('DELETE FROM ' + name + ' WHERE name=$1', [key]);
            continue;
          }

          if (client.query('SELECT 1 FROM ' + name + ' WHERE name=$1', [key]).rowCount) {
            continue;
          }

          if (name === 'setting' && value === undefined) {
            throw new Error('Missing seed value');
          }

          const columns: string = name === 'setting' ? 'id,name,value,created_at,updated_at' : 'id,name,created_at,updated_at';
          const bindings: string = name === 'setting' ? '$1,$2,$3,unixepoch()*1000,unixepoch()*1000' : '$1,$2,unixepoch()*1000,unixepoch()*1000';
          client.query('INSERT INTO ' + name + ' (' + columns + ') VALUES (' + bindings + ')', name === 'setting' ? [randomUUID(), key, value] : [randomUUID(), key]);
        }
      });
  }

  public async audit(): Promise<AuditResult> {
    const duplicates: AuditResult['duplicates'] = this.database.query<AuditResult['duplicates'][number]>('SELECT task_id,start_time,work_log_id,CAST(COUNT(*) AS TEXT) AS duplicate_count FROM jira_work_log GROUP BY task_id,start_time,work_log_id HAVING COUNT(*)>1 ORDER BY COUNT(*) DESC,task_id ASC').rows;
    const invalid: AuditResult['invalidTimeLogs'] = this.database.query<{
      id: string;
      task_id: string;
      start_time: number;
      end_time: number
    }>('SELECT id,task_id,start_time,end_time FROM time_log WHERE end_time IS NOT NULL AND end_time<=start_time ORDER BY task_id ASC,start_time ASC').rows;

    return {
      duplicates,
      invalidTimeLogs: invalid
    };
  }
}
