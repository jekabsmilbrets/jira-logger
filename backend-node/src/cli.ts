import { pathToFileURL } from 'node:url';
import { Application } from './application.js';
import type { MaintenanceService } from './maintenance.js';

export class MaintenanceCommand {
  constructor(private readonly maintenance: MaintenanceService) { }
  async run(args: readonly string[]): Promise<void> {
    const [command, name = ''] = args;
    switch (command) {
      case 'prepare-db': await this.maintenance.prepareDatabase(); break;
      case 'migrate': await this.maintenance.migrate(); break;
      case 'migrations:status': console.table(await this.maintenance.status()); break;
      case 'seed:setting': await this.maintenance.seed('setting'); break;
      case 'seed:tag': await this.maintenance.seed('tag'); break;
      case 'seed:load': await this.maintenance.seed(name); break;
      case 'seed:unload': await this.maintenance.seed(name, true); break;
      case 'app:audit:jira-sync-data': console.log(JSON.stringify(await this.maintenance.audit(), null, 2)); break;
      default: throw new RangeError('Unsupported maintenance command');
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const application = new Application();
  try { await new MaintenanceCommand(application.maintenance).run(process.argv.slice(2)); }
  catch (error) {
    console.error(error instanceof RangeError ? error.message : 'Database maintenance failed');
    process.exitCode = error instanceof RangeError ? 2 : 1;
  } finally { await application.close(); }
}
