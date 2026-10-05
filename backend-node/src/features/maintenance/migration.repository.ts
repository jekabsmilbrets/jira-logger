import { readFileSync } from 'node:fs';

import type { Database } from '@database/database';

import type { Migration, MigrationVersion } from '@features/maintenance/maintenance.types';


const migrations: Migration[] = [
  {
    version: 1,
    sql: readFileSync(new URL('./migrations/001-initial.sql', import.meta.url), 'utf8')
  }
];

export class MigrationRepository {
  constructor(
    private readonly database: Database,
    private readonly versions: readonly Migration[] = migrations,
  ) {}

  public status(): MigrationVersion[] {
    const version: number = Number(this.database.query<{ user_version: number }>('PRAGMA user_version').rows[0]?.user_version ?? 0);

    return this.versions.map(
      (
        migration,
      ) => ({
        version: migration.version,
        applied: migration.version <= version
      }));
  }

  public migrate(): void {
    const latest: number = this.versions.at(-1)?.version ?? 0;

    for (const migration of this.versions) {
      this.database.transaction(
        (
          client,
        ) => {
          const version: number = Number(client.query<{ user_version: number }>('PRAGMA user_version').rows[0]?.user_version ?? 0);

          if (version > latest) {
            throw new Error('Database schema is newer than this application');
          }

          if (version >= migration.version) {
            return;
          }

          if (version !== migration.version - 1) {
            throw new Error('Missing database migration');
          }

          this.database.exec(migration.sql);
          this.database.exec('PRAGMA user_version = ' + migration.version);
        });
    }
  }
}
