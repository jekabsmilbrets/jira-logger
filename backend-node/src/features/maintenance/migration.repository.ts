import type { Database }        from '@database/database';
import type { DatabaseSession } from '@database/database.types';

import type { MigrationVersion }     from '@features/maintenance/maintenance.types';
import { migrationLock, migrations } from '@features/maintenance/migrations.constants';


export class MigrationRepository {
  constructor(
    private readonly database: Pick<Database, 'connect' | 'query'>,
  ) {
  }

  public async status(): Promise<MigrationVersion[]> {
    return (await this.database.query<MigrationVersion>('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows;
  }

  public async migrate(): Promise<void> {
    const client: DatabaseSession = await this.database.connect();

    try {
      await client.query('SELECT pg_advisory_lock($1)', [migrationLock]);
      await client.query('CREATE TABLE IF NOT EXISTS doctrine_migration_versions (version VARCHAR(191) NOT NULL PRIMARY KEY, executed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, execution_time INT DEFAULT NULL)');

      for (const migration of migrations) {
        if ((await client.query('SELECT 1 FROM doctrine_migration_versions WHERE version=$1', [migration.version])).rowCount) {
          continue;
        }

        const start: number = Date.now();
        await client.query('BEGIN');

        try {
          for (const sql of migration.sql) {
            await client.query(sql);
          }

          await client.query('INSERT INTO doctrine_migration_versions VALUES ($1, CURRENT_TIMESTAMP, $2)', [migration.version, Date.now() - start]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [migrationLock]);
      } finally {
        client.release();
      }
    }
  }
}
