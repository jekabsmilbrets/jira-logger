import type { AuditResult, MaintenanceStore, MigrationVersion } from '@features/maintenance/maintenance.types';
import type { MigrationRepository }                             from '@features/maintenance/migration.repository';
import { settingSeeds, tagSeeds }                               from '@features/maintenance/seeds.constants';


export class MaintenanceService {
  constructor(
    private readonly repository: MaintenanceStore,
    private readonly migrations: Pick<MigrationRepository, 'migrate' | 'status'>,
  ) {
  }

  public async prepareDatabase(): Promise<void> {
    await this.repository.createDatabase();
    await this.migrations.migrate();
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
}
