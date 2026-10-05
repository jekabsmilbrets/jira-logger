import { pathToFileURL } from 'node:url';

import { Application } from '@application/application';
import { Configuration } from '@application/configuration';

import { Database } from '@database/database';

import { MaintenanceCommand } from '@features/maintenance/maintenance.command';


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let application: Application | undefined;

  try {
    const config: Configuration = new Configuration();
    const readOnlyOperation: boolean = ['db:backup', 'migrations:status', 'app:audit:jira-sync-data'].includes(process.argv[2] ?? '');
    application = new Application(config, {
      database: new Database(config.database, !readOnlyOperation)
    });
    await new MaintenanceCommand(application.maintenance).run(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof RangeError ? error.message : 'Database maintenance failed');
    process.exitCode = error instanceof RangeError ? 2 : 1;
  } finally {
    await application?.close();
  }
}
