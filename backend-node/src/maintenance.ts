import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from './config.js';
import { db, transaction } from './db.js';
import { migrate } from './migrations.js';

export const settingSeeds = {
  'jira.enabled': 'false',
  'jira.host': 'https://jira.com',
  'jira.personal-access-token': 'jira_personal_access_token',
  'jira.user-time-zone': 'Europe/Riga',
  'jira.locale': 'lv-LV',
};
export const tagSeeds = ['CAPEX', 'OPEX', 'OTHER'];

export async function seed(name: string, unload = false): Promise<void> {
  if (name !== 'setting' && name !== 'tag') throw new RangeError(`Unsupported seed "${name}".`);
  await transaction(async client => {
    const names = name === 'setting' ? Object.keys(settingSeeds) : tagSeeds;
    if (unload) {
      await client.query(`DELETE FROM ${name} WHERE name = ANY($1)`, [names]);
      return;
    }
    for (const key of names) {
      if ((await client.query(`SELECT 1 FROM ${name} WHERE name=$1`, [key])).rowCount) continue;
      const values = [randomUUID(), key];
      if (name === 'setting') values.push(settingSeeds[key as keyof typeof settingSeeds]);
      await client.query(`INSERT INTO ${name} (id, name, ${name === 'setting' ? 'value,' : ''} created_at, updated_at) VALUES ($1,$2,${name === 'setting' ? '$3,' : ''}date_trunc('second',CURRENT_TIMESTAMP),date_trunc('second',CURRENT_TIMESTAMP))`, values);
    }
  });
}

export async function prepareDatabase(): Promise<void> {
  const url = new URL(config.database);
  const name = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) {
      try { await admin.query(`CREATE DATABASE "${name.replaceAll('"', '""')}"`); }
      catch (error) { if ((error as { code?: string }).code !== '42P04') throw error; }
    }
  } finally { await admin.end(); }
  await migrate();
}

export async function audit() {
  const duplicates = await db.query('SELECT task_id,start_time,work_log_id,COUNT(*) AS duplicate_count FROM jira_work_log GROUP BY task_id,start_time,work_log_id HAVING COUNT(*)>1 ORDER BY duplicate_count DESC,task_id ASC');
  const invalid = await db.query('SELECT id,task_id,start_time,end_time FROM time_log WHERE end_time IS NOT NULL AND end_time<=start_time ORDER BY task_id ASC,start_time ASC');
  return { duplicates: duplicates.rows, invalidTimeLogs: invalid.rows };
}
