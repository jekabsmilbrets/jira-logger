import type { Database } from '@database/database';

import type { AuditResult, MaintenanceStore, MigrationVersion } from '@features/maintenance/maintenance.types';
import type { MigrationRepository }                             from '@features/maintenance/migration.repository';
import { settingSeeds, tagSeeds }                               from '@features/maintenance/seeds.constants';


export class MaintenanceService {
  constructor(
    private readonly repository: MaintenanceStore,
    private readonly migrations: Pick<MigrationRepository, 'migrate' | 'status'>,
    private readonly database?: Pick<Database, 'backup'>,
  ) {
  }

  public async prepareDatabase(): Promise<void> {
    const fresh: boolean = !this.migrations.status().some(
      (
        version,
      ) => version.applied,
    );
    await this.migrations.migrate();

    if (fresh) {
      await this.seed('setting');
      await this.seed('tag');
    }
  }

  public async migrate(): Promise<void> {
    await this.migrations.migrate();
  }

  public async status(): Promise<MigrationVersion[]> {
    return this.migrations.status();
  }

  public async seed(
    name: string,
    unload = false,
  ): Promise<void> {
    if (name !== 'setting' && name !== 'tag') {
      throw new RangeError(`Unsupported seed "${ name }".`);
    }

    const entries: [string, string | undefined][] = name === 'setting' ? Object.entries(settingSeeds) : tagSeeds.map(
      (
        key,
      ) => [key, undefined],
    );
    await this.repository.seed(name, entries, unload);
  }

  public async audit(): Promise<AuditResult> {
    return this.repository.audit();
  }

  public async backup(
    path: string,
  ): Promise<void> {
    if (!this.database) {
      throw new Error('Backup unavailable');
    }

    if (this.migrations.status().some(
      (
        version,
      ) => !version.applied,
    )) {
      throw new Error('Cannot back up an uninitialized database');
    }

    await this.database.backup(path);
  }
}
