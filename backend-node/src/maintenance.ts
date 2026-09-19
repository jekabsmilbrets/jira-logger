import type { MaintenanceStore, AuditResult } from './maintenance.repository.js';
import type { MigrationRepository, MigrationVersion } from './migrations.js';

export const settingSeeds = {
  'jira.enabled': 'false',
  'jira.host': 'https://jira.com',
  'jira.personal-access-token': 'jira_personal_access_token',
  'jira.user-time-zone': 'Europe/Riga',
  'jira.locale': 'lv-LV',
};
export const tagSeeds = ['CAPEX', 'OPEX', 'OTHER'];

export class MaintenanceService {
  constructor(private readonly repository: MaintenanceStore, private readonly migrations: Pick<MigrationRepository, 'migrate' | 'status'>) { }
  async prepareDatabase(): Promise<void> { await this.repository.createDatabase(); await this.migrations.migrate(); }
  async migrate(): Promise<void> { await this.migrations.migrate(); }
  async status(): Promise<MigrationVersion[]> { return this.migrations.status(); }
  async seed(name: string, unload = false): Promise<void> {
    if (name !== 'setting' && name !== 'tag') throw new RangeError(`Unsupported seed "${name}".`);
    const entries: [string, string | undefined][] = name === 'setting' ? Object.entries(settingSeeds) : tagSeeds.map(key => [key, undefined]);
    await this.repository.seed(name, entries, unload);
  }
  async audit(): Promise<AuditResult> { return this.repository.audit(); }
}
