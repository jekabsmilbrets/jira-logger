import { pathToFileURL }      from 'node:url';

import { Application } from '@application/application';

import { MaintenanceCommand } from '@features/maintenance/maintenance.command';


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const application: Application = new Application();

  try {
    await new MaintenanceCommand(application.maintenance).run(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof RangeError ? error.message : 'Database maintenance failed');
    process.exitCode = error instanceof RangeError ? 2 : 1;
  } finally {
    await application.close();
  }
}
