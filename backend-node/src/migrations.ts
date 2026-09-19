import type { Database } from './db.js';

export const migrationLock = 20221216190644;
const tables = ['jira_work_log', 'setting', 'tag', 'task', 'time_log'];
const timestamps = 'created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL';
export const migrations = [
  {
    version: 'DoctrineMigrations\\Version20221216190644', sql: [
      `CREATE TABLE jira_work_log (id UUID NOT NULL, task_id UUID NOT NULL, work_log_id VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, time_spent_seconds INT NOT NULL, start_time DATE NOT NULL, ${timestamps}, PRIMARY KEY(id))`,
      'CREATE INDEX IDX_2BD046888DB60186 ON jira_work_log (task_id)',
      `CREATE TABLE setting (id UUID NOT NULL, name VARCHAR(255) NOT NULL, value VARCHAR(512) NOT NULL, ${timestamps}, PRIMARY KEY(id))`,
      'CREATE UNIQUE INDEX UNIQ_9F74B8985E237E06 ON setting (name)',
      'CREATE UNIQUE INDEX UNIQ_9F74B8981D775834 ON setting (value)',
      `CREATE TABLE tag (id UUID NOT NULL, name VARCHAR(255) NOT NULL, ${timestamps}, PRIMARY KEY(id))`,
      'CREATE UNIQUE INDEX UNIQ_389B7835E237E06 ON tag (name)',
      'CREATE TABLE tag_task (tag_id UUID NOT NULL, task_id UUID NOT NULL, PRIMARY KEY(tag_id, task_id))',
      'CREATE INDEX IDX_BC716493BAD26311 ON tag_task (tag_id)',
      'CREATE INDEX IDX_BC7164938DB60186 ON tag_task (task_id)',
      `CREATE TABLE task (id UUID NOT NULL, name VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, ${timestamps}, PRIMARY KEY(id))`,
      'CREATE UNIQUE INDEX UNIQ_527EDB255E237E06 ON task (name)',
      `CREATE TABLE time_log (id UUID NOT NULL, task_id UUID NOT NULL, start_time TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, end_time TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, description VARCHAR(255) DEFAULT NULL, ${timestamps}, PRIMARY KEY(id))`,
      'CREATE INDEX IDX_55BE03AF8DB60186 ON time_log (task_id)',
      ...tables.map(table => `COMMENT ON COLUMN ${table}.id IS '(DC2Type:uuid)'`),
      ...['jira_work_log.task_id', 'time_log.task_id', 'tag_task.tag_id', 'tag_task.task_id'].map(column => `COMMENT ON COLUMN ${column} IS '(DC2Type:uuid)'`),
      'ALTER TABLE jira_work_log ADD CONSTRAINT FK_2BD046888DB60186 FOREIGN KEY (task_id) REFERENCES task (id) NOT DEFERRABLE INITIALLY IMMEDIATE',
      'ALTER TABLE tag_task ADD CONSTRAINT FK_BC716493BAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE',
      'ALTER TABLE tag_task ADD CONSTRAINT FK_BC7164938DB60186 FOREIGN KEY (task_id) REFERENCES task (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE',
      'ALTER TABLE time_log ADD CONSTRAINT FK_55BE03AF8DB60186 FOREIGN KEY (task_id) REFERENCES task (id) NOT DEFERRABLE INITIALLY IMMEDIATE',
    ]
  },
  {
    version: 'DoctrineMigrations\\Version20250606180000', sql: tables.map(table => {
      const columns = table === 'time_log' ? ['start_time', 'end_time', 'created_at', 'updated_at'] : ['created_at', 'updated_at'];
      return `ALTER TABLE ${table} ` + columns.map(column => `ALTER COLUMN ${column} TYPE TIMESTAMPTZ USING ${column} AT TIME ZONE 'Europe/Riga'`).join(', ');
    })
  },
];

export interface MigrationVersion { version: string; executed_at: string | null; execution_time: number | null; }
export class MigrationRepository {
  constructor(private readonly database: Pick<Database, 'connect' | 'query'>) { }
  async status(): Promise<MigrationVersion[]> { return (await this.database.query<MigrationVersion>('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows; }
  async migrate(): Promise<void> {
    const client = await this.database.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [migrationLock]);
      await client.query('CREATE TABLE IF NOT EXISTS doctrine_migration_versions (version VARCHAR(191) NOT NULL PRIMARY KEY, executed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, execution_time INT DEFAULT NULL)');
      for (const migration of migrations) {
        if ((await client.query('SELECT 1 FROM doctrine_migration_versions WHERE version=$1', [migration.version])).rowCount) continue;
        const start = Date.now();
        await client.query('BEGIN');
        try {
          for (const sql of migration.sql) await client.query(sql);
          await client.query('INSERT INTO doctrine_migration_versions VALUES ($1, CURRENT_TIMESTAMP, $2)', [migration.version, Date.now() - start]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      try { await client.query('SELECT pg_advisory_unlock($1)', [migrationLock]); }
      finally { client.release(); }
    }
  }
}
